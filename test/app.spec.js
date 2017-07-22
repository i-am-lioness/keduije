/* eslint-env mocha */
import { expect } from 'chai';
import request from 'supertest';
import cheerio from 'cheerio';
import APP from '../lib/app';
import { tables } from '../lib/constants';
import TestDB from './utils/db';
import { newMedia, slugs, newLines } from './utils/client-data';
import { revisionTypes } from '../lib/revision';
import { users, mail, setLoggedInUser } from './utils/mocks';

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

let testUser = member;

// let loggedInUser = null;

const ensureLoggedIn = (req, res, next) => {
  req.user = testUser;
  if (req.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

function Revision(db) {
  function onUpdateRequest(changesetID, mediaID, type, data) {
    if (type === revisionTypes.LINE_ADD) {
      const newLine = data;
      newLine.media = ObjectId(mediaID);
      newLine.changeset = ObjectId(changesetID);
      newLine.version = 1;
      newLine.deleted = false;
      newLine.heading = null;
      return db(tables.LINES).insertOne(newLine);
    }
    // else
    let collectionName = tables.MEDIA;
    let forID = ObjectId(mediaID);
    if (type === revisionTypes.LINE_EDIT) {
      collectionName = tables.LINES;
      forID = ObjectId(data.original._id);
    }
    const queryObj = { _id: ObjectId(forID) };
    const updateObj = {
      $currentDate: { lastModified: true },
      $set: data.changes,
      $inc: { version: 1 },
    };


    return db(collectionName)
      .findOneAndUpdate(queryObj, updateObj, { returnOriginal: false })
      .then(result => result.value);
  }

  this.execute = onUpdateRequest;
}

require('dotenv').config();

describe('app.js', () => {
  let server;
  let env;
  let db;

  let revertEnsureLoggedIn;
  let revertUsers;
  let revertMail;
  let revertRevision;
  let revertDB;

  before(function () {
    revertEnsureLoggedIn = APP.__Rewire__('ensureLoggedIn', () => ensureLoggedIn);
    revertUsers = APP.__Rewire__('users', users);
    revertMail = APP.__Rewire__('mail', mail);
    revertRevision = APP.__Rewire__('Revision', Revision);
    revertDB = APP.__Rewire__('DB_URL', process.env.TEST_DB_URL);
    return APP().then((result) => {
      server = result.server;
      env = result.env;
      db = result.db;
    }).catch(function (error) {
      this.skip();
      console.error(error);
      throw error;
    }.bind(this));
  });

  after(function () {
    revertEnsureLoggedIn();
    revertUsers();
    revertMail();
    revertRevision();
    revertDB();
    return TestDB.close(db).then(() => server.close());
  });

  describe('server initialization', function () {
    it('loads environment variables', function () {
      expect(env.HOST).to.not.be.empty;
      expect(env.FB_CLIENT_ID).to.not.be.empty;
      expect(env.FB_CLIENT_SECRET).to.not.be.empty;
      expect(env.TWITTER_CONSUMER_KEY).to.not.be.empty;
      expect(env.DB_URL).to.not.be.empty;
      expect(env.TWITTER_CONSUMER_SECRET).to.not.be.empty;
      expect(env.DEVELOPER_IP).to.not.be.empty;
      expect(env.EMAIL_ADDRESS).to.not.be.empty;
      expect(env.EMAIL_PASSWORD).to.not.be.empty;
    });

    it('connects to server', function () {
      expect(server).to.exist;
    });

    it('can serve generic request', function () {
      return request(server)
        .get('/')
        .expect(200);
    });

    it('can handle app start failure', function () {
      return APP().catch((err) => {
        expect(err.code).to.equal('EADDRINUSE');
      });
    });

    it('can handle db connection failure', function () {
      APP.__Rewire__('DB_URL', '');
      return APP().catch((err) => {
        APP.__Rewire__('DB_URL', process.env.TEST_DB_URL);
        expect(err.message).to.equal('invalid schema, expected mongodb');
      });
    });
  });

  it('POST /api/media/new should fail for unauthorized user', function () {
    return request(server)
      .post('/api/media/new')
      .send(newMedia[0])
      .expect(403);
  });

  it('POST /api/media/new should add new song', function () {
    testUser = admin;

    return request(server)
      .post('/api/media/new')
      .send(newMedia[0])
      .expect(200)
      .then((res) => {
        expect(res.text).to.equal('Thriller');
        const insertedId = res.header['inserted-id'];
        return db(tables.MEDIA).find({ _id: ObjectId(insertedId) }).limit(1).next();
      })
      .then((media) => {
        expect(media.changeset).to.be.an.instanceof(ObjectId);
        expect(media.creator).to.be.an.instanceof(ObjectId);
        expect(media.version).to.equal(1);
        expect(media.status).to.equal('published');
        // to do: check other properties
      });
  });

  it('redirects /history when not logged in ', function () {
    testUser = null;
    return request(server)
      .get('/history')
      .expect(302)
      .then(() => {
        testUser = member; // TO DO: better restore
      });
  });

  it('serves /history for authenticated user ', function () {
    return request(server)
      .get('/history')
      .expect(200)
      .then((res) => {
        const re = /var props=({.*})\|\|\s{};/;
        const matches = res.text.match(re);
        if (!matches) {
          throw new Error('could not find props data sent from server');
        }

        const props = JSON.parse(matches[1]);
        expect(props.userID).to.be.ok;
        expect(() => ObjectId(props.userID)).not.to.throw();
        expect(props.mediaID).to.be.undefined;
      });
  });

  describe('adding media listings', function () {
    let current = 0;
    let mediaObj;
    let slug;
    beforeEach(function () {
      testUser = admin;
      mediaObj = newMedia[current];
      slug = slugs[current];
      current += 1;
      current %= newMedia.length;
      return request(server)
        .post('/api/media/new')
        .send(mediaObj)
        .expect(200);
    });

    it('responds to /music/:slug (for video)', function () {
      return request(server)
        .get(`/music/${slug}`)
        .expect(200)
        .then(function (res) {
          $ = cheerio.load(res.text);
          expect($('nav').length).to.equal(1);
          expect($('#root').length).to.equal(1);

          // to do: consider getting id through header
          const re = /var props=({.*})\|\|\s{};/;
          const matches = res.text.match(re);
          if (!matches) {
            throw new Error('could not find props data sent from server');
          }

          const props = JSON.parse(matches[1]);
          expect(props.title).to.equal(mediaObj.title);
          expect(props.canEdit).to.be.false;
          return db(tables.MEDIA).findOne({ slug }).then((media) => {
            expect(media.stats.views).to.equal(1);
          });
        });
    });

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

      return req(views).then(() => db(tables.MEDIA).findOne({ slug }))
      .then((media) => {
        expect(media.stats.views).to.equal(views + 1);
      });
    });

    it('responds to /music/:slug with edit priveledges (and for audio)', function () {
      const loggedInUser = {
        isAdmin: true,
      };

      setLoggedInUser(loggedInUser);

      return request(server)
        .get(`/music/${slug}`)
        .expect(200)
        .then(function (res) {
          // loggedInUser = null;
          setLoggedInUser(null);

          const re = /var props=({.*})\|\|\s{};/;
          const matches = res.text.match(re);
          if (!matches) {
            throw new Error('could not find props data sent from server');
          }

          const props = JSON.parse(matches[1]);
          expect(props.title).to.equal(mediaObj.title);
          expect(props.canEdit).to.be.true;
          mediaObj.mediaID = props.mediaID;
        });
    });

    it('responds to /music/:slug when not found', function () {
      return request(server)
        .get('/music/Adamsfs')
        .expect(404)
        .then(function (res) {
          expect(res.text).to.equal('not found');
        });
    });

    it('responds to /music/:slug/history', function () {
      return request(server)
        .get(`/music/${slug}/history`)
        .expect(200);
    });

    it('responds to /music/:slug/history when not found', function () {
      return request(server)
        .get('/music/Adamsfs/history')
        .expect(404);
    });
  });

  describe('edit session', function () {
    let changesetID;
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
          return request(server)
            .post(`/api/start_edit/${mediaID}`)
            .expect(200)
            .then(function (res2) {
              changesetID = res2.text;
            });
        });
    });

    it('should have a valid changest', function () {
      expect(changesetID).to.be.a('string');
      expect(changesetID).not.to.be.empty;
      expect(ObjectId.bind(null, changesetID)).not.to.Throw;
    });

    it('POST /api/media/:mediaID/updateInfo to media info', function () {
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
          expect(res.body.artist).not.to.equal(mediaObj.artist);
          mediaObj.artist = mediaChange.artist;
        });
    });

    it('POST /api/media/:mediaID/updateInfo. should update slug', function () {
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
          expect(res.body.title).not.to.equal(mediaObj.title);
          expect(res.body.slug).to.equal('Bad');
          mediaObj.title = mediaChange.title;
        });
    });

    describe('lyrics', function () {
      let newLine;
      let lineID;
      before('POST /api/media/:mediaID/addline', function () {
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

      it('should correctly store new line in db', function () {
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

      it('POST /api/media/:mediaID/updateLine', function () {
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
    });
  });

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

  it('updates changset with media after media creation');

  it('never loads deleted songs');

  it('redirects to original page after sign in');

  it('stores all numbers as numbers instead of strings');

  it('updates url/slug when title changes');

  it('does not allow title/slug changes after a certain number of views');

  it('clears failed revisions');

  it('youtube source url always has matching protocol');
});
