/* eslint-env mocha */
import { expect } from 'chai';
import request from 'supertest';
import cheerio from 'cheerio';
import sinon from 'sinon';
import APP from '../lib/app';
import { tables } from '../lib/constants';
import TestDB from './utils/db';
import { newMedia, slugs, newLines } from './utils/client-data';
import { users, mail, setLoggedInUser, ensureLoggedIn, Revision } from './utils/mocks';
import { mediaTypes } from '../react/keduije-media';

const ObjectId = require('mongodb').ObjectId;

let $;

const admin = {
  _id: ObjectId('58e451206b5df803808e5912'),
  role: 'admin',
  isAdmin: true,
};

const member = {
  _id: ObjectId('58e451206b5df803808e5912'),
  role: 'member',
};

function parseProps(res) {
  const re = /var props=({.*})\|\|\s{};/;
  const matches = res.text.match(re);
  if (!matches) {
    throw new Error('could not find props data sent from server');
  }
  return JSON.parse(matches[1]);
}

describe.only('app.js |', () => {
  let env;

  before(function () {
    APP.__Rewire__('ensureLoggedIn', () => ensureLoggedIn);
    APP.__Rewire__('users', users);
    APP.__Rewire__('mail', mail);
    APP.__Rewire__('Revision', Revision);

    require('dotenv').config();
    env = process.env;
    env.DB_URL = process.env.TEST_DB_URL;
  });

  after(function () {
    APP.__ResetDependency__('ensureLoggedIn');
    APP.__ResetDependency__('users');
    APP.__ResetDependency__('mail');
    APP.__ResetDependency__('Revision');
  });

  describe('app initialization', function () {
    // GOOD
    it('can handle app start failure', function () {
      const serverFailEnv = Object.assign({}, env);
      serverFailEnv.PORT = '';
      return APP(serverFailEnv).catch(err => err).then((err) => {
        expect(err).to.be.ok;
        expect(err).to.be.an.instanceOf(Error);
        expect(err).to.haveOwnProperty('stack');
        expect(err.message).to.equal('"port" argument must be >= 0 and < 65536');
      });
    });

    // GOOD
    it('can handle db connection failure', function () {
      const startServer = sinon.stub();
      const revertStartServer = APP.__Rewire__('startServer', startServer);
      const dbFailEnv = Object.assign({}, env);
      dbFailEnv.DB_URL = '-';
      return APP(dbFailEnv).catch(err => err).then((err) => {
        revertStartServer();
        expect(startServer.called).to.be.false;
        expect(err.message).to.equal('invalid schema, expected mongodb');
      });
    });

    // GOOD
    it('throws error, if environment variables not loaded', function () {
      const failEnv = Object.assign({}, env);
      failEnv.TWITTER_CONSUMER_SECRET = '';
      return APP(failEnv).catch(err => err).then((err) => {
        expect(err.message).to.equal('Missing environment variable "TWITTER_CONSUMER_SECRET"');
      });
    });
  });

  describe('server', function () {
    let server;
    let db;

    before(function () {
      return APP(env).then((result) => {
        server = result.server;
        db = result.db;
      }).catch(function (error) {
        this.skip();
        console.error(error);
        throw error;
      }.bind(this));
    });

    after(function () {
      return TestDB.close(db).then(() => server.close());
    });

    // GOOD
    it('is initialized', function () {
      expect(server).to.exist;
    });

    // GOOD
    it('can serve generic request', function () {
      return request(server)
        .get('/')
        .expect(200);
    });

    it('serves 404 for /music/:slug when not found', function () {
      return request(server)
        .get('/music/Adamsfs')
        .expect(404)
        .then(function (res) {
          expect(res.text).to.equal('not found');
        });
    });

    describe('with anonymous user', function () {
      before(function () {
        setLoggedInUser(null);
      });

      // ✓ GOOD
      it('redirects /history', function () {
        return request(server)
          .get('/history')
          .expect(302);
      });
    });

    describe('for authenticated member', function () {
      before(function () {
        setLoggedInUser(member);
      });

      after(function () {
        setLoggedInUser(null);
      });

      // ✓ GOOD
      it('serves /history ', function () {
        return request(server)
          .get('/history')
          .expect(200)
          .then((res) => {
            const props = parseProps(res);
            expect(props.userID).to.be.ok;
            expect(() => ObjectId(props.userID)).not.to.throw();
            expect(props.mediaID).to.be.undefined;
          });
      });

      // ✓ GOOD
      it('forbids from /api/media/new', function () {
        return request(server)
          .post('/api/media/new')
          .send(newMedia[0])
          .expect(403);
      });

      // ✓ GOOD
      it('serves 404 to /music/:slug/history when not found', function () {
        return request(server)
          .get('/music/Adamsfs/history')
          .expect(404);
      });
    });

    describe('adding new media (video)', function () {
      let mediaID;
      let changesetID;
      let slug;

      const body = {
        title: 'Thriller',
        artist: 'Michael Jackson',
        type: mediaTypes.VIDEO,
        videoID: 'abcde',
        changesetID: null,
      };

      before(function () {
        setLoggedInUser(admin);
        return db(tables.CHANGESETS).insertOne({ type: 'new' })
        .then((result) => {
          changesetID = result.insertedId.toString();
          body.changesetID = changesetID;

          return request(server)
          .post('/api/media/new')
          .send(body)
          .expect(200)
          .then((res) => {
            slug = res.text;
            const insertedId = res.header['inserted-id'];
            mediaID = ObjectId(insertedId);
          });
        });
      });

      // ✓ GOOD
      it('returns slug', function () {
        expect(slug).to.equal('Thriller');
      });

      // ✓ GOOD
      it('stores all media properties', function () {
        return db(tables.MEDIA).findOne({ _id: mediaID })
        .then((media) => {
          expect(media.changeset).to.be.an.instanceof(ObjectId);
          expect(media.creator).to.be.an.instanceof(ObjectId);
          expect(media.version).to.equal(1);
          expect(media.status).to.equal('published');
          expect(media.slug).to.equal('Thriller');
          expect(media.stats).to.have.all.keys(['views', 'history', 'weeklyTotal', 'allTime']);
        });
      });

      // ✓ GOOD
      it('updates changeset with media reference', function () {
        return db(tables.CHANGESETS).findOne({ _id: ObjectId(changesetID) })
        .then((cs) => {
          expect(cs).to.haveOwnProperty('media');
          expect(cs.media).to.deep.equal(mediaID);
        });
      });

      // ✓ GOOD
      it('responds to /music/:slug/history', function () {
        return request(server)
          .get(`/music/${slug}/history`)
          .expect(200)
          .then((res) => {
            const props = parseProps(res);
            expect(props.mediaID).to.equal(mediaID.toString());
          });
      });

      // ✓ GOOD
      it('counts number of times media has been accessed', function () {
        this.timeout(4000);

        const views = 7;
        function req(i) {
          return request(server)
            .get(`/music/${slug}`)
            .expect(200)
            .then(() => {
              if (i > 0) {
                return req(i - 1);
              }
              return null;
            });
        }

        let originalCnt;
        return db(tables.MEDIA).findOne({ slug }).then((media) => {
          originalCnt = media.stats.views;
          return req(views);
        }).then(() => db(tables.MEDIA).findOne({ slug }))
          .then((media) => {
            expect(media.stats.views).to.equal(views + originalCnt + 1);
          });
      });

      describe('and /music/:slug (non-admin)', function () {
        let mediaPageResponse;
        let originalViewCnt;
        let originalCnt;
        let props;

        before(function () {
          setLoggedInUser(null);
          return db(tables.MEDIA).findOne({ slug }).then((media) => {
            originalViewCnt = media.stats.views;
            originalCnt = media.stats.allTime;
            return request(server)
            .get(`/music/${slug}`)
            .expect(200)
            .then(function (res) {
              mediaPageResponse = res;
              props = parseProps(res);
            });
          });
        });

        // ✓ GOOD
        it('serves expected html', function () {
          $ = cheerio.load(mediaPageResponse.text);
          expect($('nav').length).to.equal(1);
          expect($('#root').length).to.equal(1);
          expect($('title').text()).to.include(body.title);
        });

        // ✓ GOOD
        it('does not allow user to edit', function () {
          expect(props.canEdit).to.be.false;
        });

        // ✓ GOOD
        it('passes valid youtube url', function () {
          const re = /http:\/\/www.youtube.com\/embed\/(.*)\?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=(.*):\/\/(.*)&playsinline=1&rel=0&controls=0/;
          const matches = props.src.match(re);
          if (!matches) {
            throw new Error('could not parse youtube src');
          }
          expect(matches.length).to.be.ok;
          expect(matches[1]).to.equal(body.videoID);
        });

        // ✓ GOOD
        it('increments view count', function () {
          return db(tables.MEDIA).findOne({ slug }).then((media) => {
            expect(media.stats.views).to.equal(originalViewCnt + 1);
            expect(media.stats.allTime).to.equal(originalCnt + 1);
          });
        });
      }); // describe('and /music/:slug (non-admin)'
    }); // describe('adding new media (video)')

    describe('upon adding new media (audio)', function () {
      let slug;
      let mediaID;

      const body = {
        title: 'All Night',
        artist: 'Beyonce',
        type: mediaTypes.AUDIO,
        src: 'wikipedia.com',
      };

      before(function () {
        setLoggedInUser(admin);
        return request(server)
          .post('/api/media/new')
          .send(body)
          .expect(200)
          .then((res) => {
            slug = res.text;

            const insertedId = res.header['inserted-id'];
            mediaID = insertedId;
          });
      });

      // ✓ GOOD
      it('returns slug', function () {
        expect(slug).to.equal('All-Night');
      });

      describe('and /music/:slug (for audio with admin user)', function () {
        let props;

        before(function () {
          return request(server)
            .get(`/music/${slug}`)
            .expect(200)
            .then(function (res) {
              props = parseProps(res);
            });
        });

        // ✓ GOOD
        it('allows user to edit', function () {
          expect(props.canEdit).to.be.true;
        });

        // ✓ GOOD
        it('passes valid audio src', function () {
          expect(props.src).to.equal(body.src);
        });
      }); // describe('and /music/:slug (for audio)'

      describe.only('during edit session', function () {
        let changesetID;

        before(function () {
          return request(server)
            .post(`/api/start_edit/${mediaID}`)
            .expect(200)
            .then(function (res2) {
              changesetID = res2.text;
            });
        });

        it('should have a valid changest', function () {
          expect(changesetID).to.be.a('string');
          expect(changesetID).not.to.be.empty;
          expect(ObjectId.bind(null, changesetID)).not.to.Throw;
        });

        it('should update media info', function () {
          const mediaChange = {
            artist: 0,
          };

          return request(server)
            .post(`/api/media/${mediaID}/updateInfo`)
            .send({
              changes: mediaChange,
              changesetID,
              mediaID,
            })
            .expect(200)
            .then((res) => {
              expect(res.body.artist).to.equal(mediaChange.artist);
              expect(res.body.artist).not.to.equal(body.artist);
            });
        });

        it('should update slug', function () {
          const mediaChange = {
            title: 'Bad',
          };

          return request(server)
            .post(`/api/media/${mediaID}/updateInfo`)
            .send({
              changes: mediaChange,
              changesetID,
              mediaID,
            })
            .expect(200)
            .then((res) => {
              expect(res.body.title).to.equal(mediaChange.title);
              expect(res.body.title).not.to.equal(body.title);
              expect(res.body.slug).to.equal('Bad');
            });
        });

        describe('.And new line', function () {
          let newLine;
          let lineID;
          before(function () {
            newLine = newLines[0];
            newLine.changesetID = changesetID;

            return request(server)
              .post(`/api/media/${mediaID}/addline`)
              .send(newLine)
              .expect(200)
              .then((res) => {
                expect(res.body).to.be.an('array');
                lineID = res.header['inserted-id'];
                newLine._id = lineID;
              });
          });

          it('should be correctly stored in db', function () {
            newLine.changesetID = changesetID;

            return db(tables.LINES)
              .find({ _id: ObjectId(lineID) })
              .limit(1)
              .next()
              .then((line) => {
                expect(line.changeset).to.be.an.instanceof(ObjectId);
                expect(line.changeset.toString()).to.equal(changesetID);
                expect(line.media).to.be.an.instanceof(ObjectId);
                expect(line.media.toString()).to.equal(mediaID);
                expect(line.creator).to.be.an.instanceof(ObjectId);
                expect(line.version).to.equal(1);
                expect(line.deleted).to.equal(false);
                expect(line.heading).to.equal(null);
                expect(line.startTime).to.equal(newLine.startTime);
                expect(line.endTime).to.equal(newLine.endTime);
                expect(line.text).to.equal(newLine.text);
              });
          });

          it('should be updated', function () {
            const lineChange = {
              text: 'bye bye, bye',
            };

            return request(server)
              .post(`/api/media/${mediaID}/updateLine`)
              .send({
                original: newLine,
                changes: lineChange,
                changesetID,
                mediaID,
              })
              .expect(200)
              .then((res) => {
                expect(res.body).to.be.an('array');
                return db(tables.LINES).find({ _id: ObjectId(lineID) }).limit(1).next();
              })
              .then((line) => {
                expect(line.text).to.equal(lineChange.text);
                expect(line.text).not.to.equal(newLine.text);
                expect(line.version).to.equal(2);

                expect(line.changeset).to.be.an.instanceof(ObjectId);
                expect(line.changeset.toString()).to.equal(changesetID);
                expect(line.media).to.be.an.instanceof(ObjectId);
                expect(line.media.toString()).to.equal(mediaID);
                expect(line.creator).to.be.an.instanceof(ObjectId);
                expect(line.deleted).to.equal(false);
                expect(line.heading).to.equal(null);
                expect(line.startTime).to.equal(newLine.startTime);
                expect(line.endTime).to.equal(newLine.endTime);
              });
          });

          it('should add multiple lines to db', function () {
            this.timeout(4000);

            const count = 11;
            function req(i) {
              const nthLine = {
                text: `line ${i}`,
                startTime: i * 6,
                endTime: i * 7,
              };
              return request(server)
                .post(`/api/media/${mediaID}/addline`)
                .send(nthLine)
                .expect(200)
                .then(() => {
                  if (i > 0) {
                    return req(i - 1);
                  }
                  return null;
                });
            }

            const media = ObjectId(mediaID);
            return req(count).then(() => db(tables.LINES).find({ media }).count())
            .then((cnt) => {
              expect(cnt).to.be.at.least(count);
            });
          });
        }); // describe('.And new line')
      }); // describe('during edit session')
    }); // describe('adding new media (audio)')
  }); // describe('server')

  describe('ajax requests- ', function () {
    before(function () {
      // automatically authorize request
      // app.use();
    });

    it('/api/changesets/list', function () {
      return request(server)
        .get('/api/changesets/list?userID')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
          debugger;
          res.body.forEach((cs) => {
            expect(cs).to.have.property('type');
            expect(cs.type).to.be.oneOf(['new', 'edit', 'rollback']);
            if (cs.type === 'edit') {
              expect(cs).to.have.property('revisions');
              expect(cs.revisions).to.be.an('array');
            }
            // should not send unprocessed data
            expect(cs).to.have.property('media');
          });
        });
    });

    it('/api/changesets/list', function () {
      return request(server)
        .get('/api/changesets/list?userID=596c61f94a25ca3a77e25da9')
        .expect(200)
        .then(function (res) {
          // TO DO: test actual content
          console.log('body', res.body);
          expect(res.body).to.be.an('array');
        });
    });

    it('/api/changesets/list', function () {
      return request(server)
        .get('/api/changesets/list?mediaID=58e638a2d300e060f9cdd6ca')
        .expect(200)
        .then(function (res) {
          // TO DO: test actual content
          expect(res.body).to.be.an('array');
        });
    });

    it('/api/changesets/list', function () {
      return request(server)
        .get('/api/changesets/list?mediaID=58e638a2d300e060f9cdd6ca&fromID=58eb3cceb1dd4ced9f759083')
        .expect(200)
        .then(function (res) {
          // TO DO: test actual content
          expect(res.body).to.be.an('array');
        });
    });

    it('/api/changesets/list should support paging');

    it('/api/search', function () {
      return request(server)
        .get('/api/search?query=phyno')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
        });
    });

    it('/api/search with blank query should return empty object', function () {
      return request(server)
        .get('/api/search?query=')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('object');
        });
    });

    it('/api/media/list shows list for logged in user', function () {
      return request(server)
        .get('/api/media/list')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
        });
    });

    it('/api/rankings', function () {
      return request(server)
        .get('/api/rankings')
        .expect(200);
    });

    it('/api/list/audio', function () {
      return request(server)
        .get('/api/list/audio')
        .expect(200);
    });

    it('/api/carousel', function () {
      return request(server)
        .get('/api/carousel')
        .expect(200);
    });

    it('/api/logError', function () {
      return request(server)
        .post('/api/logError')
        .send('test browser error')
        .expect(200);
    });

    it('can handle a server error', function () {
      return request(server)
        .get('/api/changesets/list?mediaID=phyno')
        .expect(500);
    });

    it('/api/spotify/token', function () {
      return request(server)
        .get('/api/spotify/token')
        .expect(200)
        .then((res) => {
          expect(res.body).to.have.all.keys(['access_token', 'token_type', 'expires_in']);
        });
    });
  });

  describe('authorization routing', function () {
    it('should redirect anonymous user to login for restricted page', function () {
      testUser = member;
      return request(server)
        .get('/new_music')
        .expect(403);
    });

    it('should permit admin user to add new music', function () {
      testUser = admin; // to do: restore
      return request(server)
        .get('/new_music')
        .expect(200);
    });

    it('should log out and redirect', function () {
      return request(server)
        .get('/logout')
        .expect(302);
    });

    it('should serve login page', function () {
      return request(server)
        .get('/login')
        .expect(200);
    });

    it('should allow twitter login', function () {
      return request(server)
        .get('/login/twitter')
        .expect(302)
        .then(function (res) {
          expect(res.headers.location).to.equal('/login/twitter/return?code=111');
          return request(server).get(res.headers.location).expect(302).then(function (res2) {
            expect(res2.headers.location).to.equal('/');
          });
        });
    });

    it('should allow facebook login', function () {
      return request(server)
        .get('/login/facebook')
        .expect(302)
        .then(function (res) {
          expect(res.headers.location).to.equal('/login/facebook/return?code=111');
          return request(server).get(res.headers.location).expect(302).then(function (res2) {
            expect(res2.headers.location).to.equal('/');
          });
        });
    });
  });

  describe('halt updates during rollback- ', function () {
    let mediaObj;
    let mediaID;
    before(function () {
      testUser = admin;
      mediaObj = newMedia[2];
      return request(server)
        .post('/api/media/new')
        .send(mediaObj)
        .expect(200)
        .then((res) => {
          mediaID = res.header['inserted-id'];
          return db(tables.MEDIA)
            .updateOne({ _id: ObjectId(mediaID) }, { $set: { pendingRollbacks: [1] } });
        });
    });

    it('should not allow edit for media in the middle of a rollback', function () {
      return request(server)
        .post(`/api/start_edit/${mediaID}`)
        .expect(403)
        .then(function (res2) {
          expect(res2.text).to.equal('ROLLBACK_IN_PROGRESS');
        });
    });
  });

  it('distinguisehs between two media with the same title/slug');

  it('never loads deleted songs');

  it('redirects to original page after sign in');

  it('stores all numbers as numbers instead of strings');

  it('updates url/slug when title changes');

  it('does not allow title/slug changes after a certain number of views');

  it('clears failed revisions');

  it('youtube source url always has matching protocol');
});
