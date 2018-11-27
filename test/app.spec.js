/* eslint-env mocha */
import { expect } from 'chai';
import request from 'supertest';
import cheerio from 'cheerio';
import sinon from 'sinon';
import https from 'https';
import fs from 'fs';

import APP from '../lib/app';
import { tables } from '../lib/constants';
import TestDB from './utils/db';
import { newMedia, newLines, mediaArr } from './utils/client-data';
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
  _id: ObjectId('596c61f94a25ca3a77e25da9'),
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

const token = { a: 'a', b: 'b', c: 'c' };
const getSpotifyToken = sinon.stub();
getSpotifyToken.resolves(token);

describe('app.js |', () => {
  let env;

  before(function () {
    APP.__Rewire__('ensureLoggedIn', () => ensureLoggedIn);
    APP.__Rewire__('users', users);
    APP.__Rewire__('mail', mail);
    APP.__Rewire__('Revision', Revision);
    APP.__Rewire__('getSpotifyToken', getSpotifyToken);

    require('dotenv').config();
    env = process.env;
    env.DB_URL = process.env.LOCAL_DB ? process.env.LOCAL_DB_URL : process.env.TEST_DB_URL;
  });

  after(function () {
    APP.__ResetDependency__('ensureLoggedIn');
    APP.__ResetDependency__('users');
    APP.__ResetDependency__('mail');
    APP.__ResetDependency__('Revision');
    APP.__ResetDependency__('getSpotifyToken');
  });

  describe('app initialization', function () {
    // GOOD
    it('can handle app start failure', function () {
      const serverFailEnv = Object.assign({}, env);
      serverFailEnv.PORT = -1;
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

    // GOOD
    it('throws error, if environment variable object not passed', function () {
      return APP().catch(err => err).then((err) => {
        expect(err.message).to.equal('Missing "env" parameter');
      });
    });

    describe('-auto login-', function () {
      let loginServer;
      let loginDb;

      afterEach(function () {
        return TestDB.close(loginDb).then(() => loginServer.close());
      });

      // ✓ GOOD
      it('should return 403 when AUTO_LOGIN not set', function () {
        const failEnv = Object.assign({}, env);
        failEnv.AUTO_LOGIN = null;
        return APP(failEnv).then((result) => {
          loginServer = result.server;
          loginDb = result.db;
          return request(loginServer)
            .get('/login/auto')
            .expect(403);
        });
      });

      // ✓ GOOD
      it('should succeed when AUTO_LOGIN=1', function () {
        return APP(env).then((result) => {
          loginServer = result.server;
          loginDb = result.db;
          return request(loginServer)
            .get('/login/auto')
            .expect(302);
        });
      });
    }); // describe.only('-auto login-')
  }); // describe('app initialization')

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

    // ✓ GOOD
    it('is initialized', function () {
      expect(server).to.exist;
    });

    // ✓ GOOD
    it('can serve generic request', function () {
      return request(server)
        .get('/')
        .expect(200);
    });

    // ✓ GOOD
    it('/api/rankings', function () {
      return request(server)
        .get('/api/rankings')
        .expect(200);
    });

    // ✓ GOOD
    it('/api/list/audio', function () {
      return request(server)
        .get('/api/list/audio')
        .expect(200);
    });

    // ✓ GOOD
    it('/api/carousel', function () {
      return request(server)
        .get('/api/carousel')
        .expect(200);
    });

    // ✓ GOOD
    it('serves 404 for /music/:slug when not found', function () {
      return request(server)
        .get('/music/Adamsfs')
        .expect(404)
        .then(function (res) {
          expect(res.text).to.equal('not found');
        });
    });

    // ✓ GOOD
    it('queries spotify for token', function () {
      getSpotifyToken.resetHistory();
      return request(server)
        .get('/api/spotify/token')
        .expect(200)
        .then((res) => {
          expect(getSpotifyToken.called).to.be.true;
          expect(getSpotifyToken.lastCall.args[0]).to.equal(process.env.SPOTIFY_CLIENT_ID);
          expect(getSpotifyToken.lastCall.args[1]).to.equal(process.env.SPOTIFY_CLIENT_SECRET);
          expect(res.body).to.deep.equal(token);
          // expect(res.body).to.have.all.keys(['access_token', 'token_type', 'expires_in']);
        });
    });

    describe('logging', function () {
      beforeEach(function () {
        mail.send.resetHistory();
      });

      afterEach(function () {
        users.log.resolves(null);
      });

      // ✓ GOOD
      it('only mails if request logged', function () {
        users.log.resolves('hi');
        return request(server)
          .get('/')
          .expect(200)
          .then(() => {
            expect(mail.send.callCount).to.equal(1);
            expect(mail.send.lastCall.args[0]).to.equal('hi');
          });
      });

      // ✓ GOOD
      it('/api/logError', function () {
        const msg = 'test browser error';
        return request(server)
          .post('/api/logError')
          .send({ msg })
          .expect(200)
          .then(() => {
            expect(mail.send.callCount).to.equal(1);
          });
      });
    });

    describe('on error', function () {
      class HTTP404Error extends Error {
        constructor(message) {
          super(message);
          this.name = 'hey';
        }
      }
      before(function () {
        APP.__Rewire__('HTTP404Error', HTTP404Error);
      });

      after(function () {
        APP.__ResetDependency__('HTTP404Error');
      });

      // ✓ GOOD
      it('returns 500 for end point with custom error handling', function () {
        return request(server)
          .get('/music/test')
          .expect(500);
      });
    }); // describe('on error')

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

      // ✓ GOOD
      it('serves array media belonging to logged in user', function () {
        const newMediaArr = mediaArr.map((el, idx) => {
          let newEl;
          if (idx < 3) {
            newEl = Object.assign({ creator: member._id }, el);
          } else {
            newEl = Object.assign({}, el);
          }
          delete newEl._id;
          return newEl;
        });

        return db(tables.MEDIA).insertMany(newMediaArr)
          .then(() => request(server).get('/api/media/list').expect(200))
          .then(function (res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(3);
          });
      });

      it('returns 500 for generic server error', function () {
        return request(server)
          .get('/api/changesets/list?mediaID=phyno')
          .expect(500);
      });
    }); // describe('for authenticated member')

    describe('upon adding new media (video)', function () {
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
      it('serves media info for /api/media/:mediaID', function () {
        return request(server)
          .get(`/api/media/${mediaID}`)
          .expect(200)
          .then((res) => {
            const m = res.body;
            expect(m).to.be.an('object');
            expect(m._id.toString()).to.equal(mediaID.toString());
            delete body.changesetID;
            expect(m).to.include.all.keys(Object.keys(body));
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
    }); // describe('upon adding new media (video)')

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

      describe('during edit session', function () {
        let changesetID;

        before(function () {
          return request(server)
            .post(`/api/start_edit/${mediaID}`)
            .expect(200)
            .then(function (res2) {
              changesetID = res2.text;
            });
        });

        // ✓ GOOD
        it('should have a valid changest', function () {
          expect(changesetID).not.to.be.empty;
          const c = parseInt(changesetID, 16);
          expect(c).to.be.ok;
          expect(ObjectId.bind(null, changesetID)).not.to.Throw;
        });

        // ✓ GOOD
        it('should update media info', function () {
          const mediaChange = {
            artist: 'Nnenna',
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

        // ✓ GOOD
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
          let res3;
          before(function () {
            newLine = newLines[0];
            newLine.changesetID = changesetID;

            return request(server)
              .post(`/api/media/${mediaID}/addline`)
              .send(newLine)
              .expect(200)
              .then((res) => {
                res3 = res;
                lineID = res.header['inserted-id'];
                newLine._id = lineID;
              });
          });

          // ✓ GOOD
          it('should return array of lines', function () {
            expect(res3.body).to.be.an('array');
            expect(res3.body.length).to.equal(1);
          });

          // ✓ GOOD
          it('should be correctly stored in db', function () {
            newLine.changesetID = changesetID;

            return db(tables.LINES)
              .findOne({ _id: ObjectId(lineID) })
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

          // ✓ GOOD
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

          // ✓ GOOD
          it('should add multiple lines to db', function () {
            this.timeout(4000);

            let initialCnt = 0;
            let j = 0;

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
                .then((res) => {
                  j += 1;
                  expect(res.body.length).to.equal(initialCnt + j);
                  if (i > 0) {
                    return req(i - 1);
                  }
                  return null;
                });
            }

            const media = ObjectId(mediaID);
            return db(tables.LINES).find({ media }).count()
              .then((cnt) => {
                initialCnt = cnt;
                return req(count);
              });
          });
        }); // describe('.And new line')
      }); // describe('during edit session')

      describe('in the middle of a rollback', function () {
        before(function () {
          return db(tables.MEDIA)
            .updateOne({ _id: ObjectId(mediaID) }, { $set: { pendingRollbacks: [1] } });
        });

        after(function () {
          return db(tables.MEDIA)
            .updateOne({ _id: ObjectId(mediaID) }, { $unset: { pendingRollbacks: '' } });
        });

        // ✓ GOOD
        it('should not allow edit in the middle of a rollback', function () {
          return request(server)
            .post(`/api/start_edit/${mediaID}`)
            .expect(403)
            .then(function (res) {
              expect(res.text).to.equal('ROLLBACK_IN_PROGRESS');
            });
        });
      }); // describe('in the middle of a rollback')
    }); // describe('upon adding new media (audio)')

    describe('for changesets', function () {
      let mediaID1;
      const userA = admin;
      const userB = member;
      const userAcnt = 3;
      const userBcnt = 5;

      function addLine(changesetID, mediaID) {
        return request(server)
          .post(`/api/media/${mediaID}/addline`)
          .send({ changesetID })
          .expect(200);
      }

      function req(i, mediaID) {
        return request(server)
          .post(`/api/start_edit/${mediaID}`)
          .expect(200)
          .then((res) => {
            const changesetID = res.text;
            return addLine(changesetID, mediaID).then(() => {
              if (i > 1) {
                return req(i - 1, mediaID);
              }
              return null;
            });
          });
      }
      before(function () {
        this.timeout(6000);
        return db(tables.MEDIA).insertOne({ title: 'media0' })
        .then((result) => {
          mediaID1 = result.insertedId.toString();
          return db(tables.CHANGESETS).deleteMany({});
        })
        .then(() => {
          setLoggedInUser(userA);
          return req(userAcnt, mediaID1);
        })
        .then(() => {
          setLoggedInUser(userB);
          return req(userBcnt, mediaID1);
        });
      });

      // ✓ GOOD
      it('should store them in the right format', function (done) {
        let cnt = 0;
        db(tables.CHANGESETS).find({}).forEach((cs) => {
          cnt += 1;
          expect(cs).to.have.property('type');
          expect(cs.type).to.be.oneOf(['new', 'edit', 'rollback']);
          if (cs.type === 'edit') {
            expect(cs).to.have.property('revisions');
            expect(cs.revisions).to.be.an('array');
          }
          expect(cs).to.have.property('media');
        }, () => {
          expect(cnt).to.equal(userAcnt + userBcnt);
          done();
        });
      });

      // ✓ GOOD
      it('should serve loggedin user\'s changes for /api/changesets/list?userID', function () {
        setLoggedInUser(userA);
        return request(server)
          .get('/api/changesets/list?userID')
          .expect(200)
          .then(function (res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(userAcnt);
            res.body.forEach((cs) => {
              expect(cs.user.toString()).to.equal(userA._id.toString());
            });
          });
      });

      // ✓ GOOD
      it('should serve /api/changesets/list?userID=x inspite of logged in user', function () {
        setLoggedInUser(userA);
        return request(server)
          .get(`/api/changesets/list?userID=${userB._id}`)
          .expect(200)
          .then(function (res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(userBcnt);
            res.body.forEach((cs) => {
              expect(cs.user.toString()).to.equal(userB._id.toString());
            });
          });
      });

      // ✓ GOOD
      it('should serve /api/changesets/list?mediaID=x for given media', function () {
        return request(server)
          .get(`/api/changesets/list?mediaID=${mediaID1}`)
          .expect(200)
          .then(function (res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(userBcnt + userAcnt);
            res.body.forEach((cs) => {
              expect(cs.media.toString()).to.equal(mediaID1);
            });
          });
      });

      describe('paging', function () {
        const pageLength = 10;
        let media2ID;
        const userAcnt2 = 8;
        const userBcnt2 = 7;
        before(function () {
          this.timeout(6000);
          return db(tables.MEDIA).insertOne({ title: 'media2' })
          .then((result) => {
            media2ID = result.insertedId.toString();
            setLoggedInUser(userA);
            return req(userAcnt2, media2ID);
          })
          .then(() => {
            setLoggedInUser(userB);
            return req(userBcnt2, media2ID);
          });
        });

        // ✓ GOOD
        it('should never list more than 10 changesets', function () {
          return request(server)
            .get(`/api/changesets/list?mediaID=${media2ID}`)
            .expect(200)
            .then(function (res) {
              expect(userAcnt2 + userBcnt2).to.be.greaterThan(pageLength);
              expect(res.body).to.be.an('array');
              expect(res.body.length).to.equal(pageLength);
            });
        });

        // ✓ GOOD
        it('should serve next page of given query', function () {
          return db(tables.CHANGESETS)
            .find({ media: ObjectId(media2ID) })
            .sort({ _id: -1 })
            .limit(10)
            .toArray()
            .then((changesets) => {
              const fromID = changesets[9]._id;
              return request(server)
                .get(`/api/changesets/list?mediaID=${media2ID}&fromID=${fromID}`)
                .expect(200)
                .then(function (res) {
                  expect(userAcnt2 + userBcnt2).to.be.greaterThan(pageLength);
                  expect(userAcnt2 + userBcnt2).to.be.lessThan(pageLength * 2);
                  expect(res.body).to.be.an('array');
                  expect(res.body.length).to.equal((userAcnt2 + userBcnt2) - pageLength);
                });
            });
        });
      }); // describe('paging')
    }); // describe('for changesets')

    describe('authorization routing', function () {
      // ✓ GOOD
      it('should redirect anonymous user to login for restricted page', function () {
        setLoggedInUser(null);
        return request(server)
          .get('/new_music')
          .expect(302);
      });

      // ✓ GOOD
      it('should forbid unauthorized for restricted page', function () {
        setLoggedInUser(member);
        return request(server)
          .get('/new_music')
          .expect(403);
      });

      // ✓ GOOD
      it('should permit admin user to add new music', function () {
        setLoggedInUser(admin);
        return request(server)
          .get('/new_music')
          .expect(200);
      });
    }); // describe('authorization routing')

    describe('authentication', function () {
      ['twitter', 'facebook'].forEach(function (provider) {
        describe(provider, function () {
          let agent;
          let agent2;
          const redirect = '/music/ada-ada';
          let res0;

          before(function () {
            agent = request.agent(server);
            agent2 = request.agent(server);
            return agent.get(`/login/${provider}`)
              .set('Referer', redirect)
              .then(function (res) {
                res0 = res;
                return agent2.get(`/login/${provider}`);
              });
          });

          // ✓ GOOD
          it('should set redirect ', function () {
            expect(res0.headers.location).to.be.ok;
            expect(res0.status).to.equal(302);
          });

          // ✓ GOOD
          it('should set return to orignal location upon login', function () {
            return agent.get(res0.headers.location).expect(302).then(function (res) {
              expect(res.headers.location).to.equal(redirect);
            });
          });

          // ✓ GOOD
          it('should set return to "/" when referer not set', function () {
            return agent2.get(res0.headers.location).expect(302).then(function (res) {
              expect(res.headers.location).to.equal('/');
            });
          });
        }); // describe('provider')
      });

      describe('login page', function () {
        let agent;
        const redirect = '/redirect';
        let res0;

        before(function () {
          return db(tables.SESSIONS).deleteMany({}).then(() => {
            agent = request.agent(server);
            return agent.get('/login')
              .set('Referer', redirect)
              .then(function (res) {
                res0 = res;
              });
          });
        });

        // ✓ GOOD
        it('should serve html', function () {
          expect(res0.status).to.equal(200);
          expect(res0.text).to.include('"/login');
          /* $ = cheerio.load(res0.text);
          console.log($);
          expect($('a').length).to.equal(2);
          expect($('a')[0].attr('href')).to.equal('/login/facebook');*/
        });

        // ✓ GOOD
        it('should set returnTo location', function () {
          return db(tables.SESSIONS).findOne({}).then((ses) => {
            const session = JSON.parse(ses.session);
            console.log(session);
            expect(session.returnTo).to.equal(redirect);
          });
        });
      }); // describe('login page')

      // ✓ GOOD
      it('should log out and redirect to referer', function () {
        const returnPage = 'hey/there';
        return request(server)
          .get('/logout')
          .set('Referer', returnPage)
          .expect(302)
          .then((res) => {
            expect(res.headers.location).to.equal(returnPage);
          });
      });

      // ✓ GOOD
      it('should log out and redirect to / when referer not provided', function () {
        return request(server)
          .get('/logout')
          .expect(302)
          .then((res) => {
            expect(res.headers.location).to.equal('/');
          });
      });
    }); // describe('authentication')

    describe('search', function () {
      before(function () {
        return db(tables.MEDIA).deleteMany({})
          .then(() => db(tables.MEDIA).insertMany(mediaArr));
      });

      // ✓ GOOD
      it('should return results that match title and artist', function () {
        return request(server)
          .get('/api/search?query=phy')
          .expect(200)
          .then(function (res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(3);
          });
      });

      // ✓ GOOD
      it('should just show "published" media', function () {
        return request(server)
          .get('/api/search?query=fla')
          .expect(200)
          .then(function (res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(2);
          });
      });

      // ✓ GOOD
      it('return empty object for blank query', function () {
        return request(server)
          .get('/api/search?query=')
          .expect(200)
          .then(function (res) {
            expect(res.body).to.be.an('object');
            expect(res.body).to.deep.equal({});
          });
      });
    }); // describe('search')
  }); // describe('server')

  describe('https', function () {
    let props;
    let matches;
    let server;
    let db;
    const slug = 'loving';
    const re = /(.*):\/\/www.youtube.com\/embed\/(.*)\?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=(.*):\/\/(.*)&playsinline=1&rel=0&controls=0/;

    const video0 = {
      slug,
      videoID: 'aaaa',
      type: mediaTypes.VIDEO,
    };

    before(function (done) {
      APP(env, false).then((app2) => {
        db = app2.database;
        const privateKey = fs.readFileSync('test/https/privatekey.pem').toString();
        const certificate = fs.readFileSync('test/https/certificate.pem').toString();
        const options = { key: privateKey, cert: certificate };

        server = https.createServer(options, app2);
        server.listen(3001, () => {
          console.log('https server listening on 3001');
          db(tables.MEDIA).insertOne(video0).then(() => {
            console.log('inserted data');
            done();
          }).catch((err) => {
            console.log(err);
          });
        }).on('error', (err) => {
          console.log(err);
        });
      })
      .catch((err) => {
        console.log(err);
      });
    });

    after(function () {
      return TestDB.close(db).then(() => server.close());
    });

    describe('on loading video page', function () {
      before(function () {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        return request(server)
          .get(`/music/${slug}`)
          .expect(200)
          .then(function (res2) {
            props = parseProps(res2);
            matches = props.src.match(re);
            debugger;
          })
          .catch((err) => {
            console.log(err);
          });
      });

      // ✓ GOOD
      it('puts matching protocol in youtube url', function () {
        if (!matches) {
          throw new Error('could not parse youtube src');
        }
        expect(matches.length).to.be.ok;
        expect(matches[1]).to.equal('https');
        expect(matches[1]).to.not.equal('http');
      });

      // ✓ GOOD
      it('puts matching protocol in origin parameter', function () {
        if (!matches) {
          throw new Error('could not parse youtube src');
        }
        expect(matches.length).to.be.ok;
        expect(matches[3]).to.equal('https');
        expect(matches[3]).to.not.equal('http');
      });
    });
  }); // describe('https'

  it('distinguisehs between two media with the same title/slug');

  it('never loads deleted songs');

  it('redirects to original page after sign in');

  it('stores all numbers as numbers instead of strings');

  it('updates url/slug when title changes');

  it('does not allow title/slug changes after a certain number of views');

  it('clears failed revisions');

  it('should pageinate search results');
});
