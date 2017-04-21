/* eslint-env mocha */
import { expect } from 'chai';
import request from 'supertest';
import cheerio from 'cheerio';
import sinon from 'sinon';
import APP from '../lib/app';

const ObjectId = require('mongodb').ObjectId;

let $;

let testUser = {
  _id: '58e451206b5df803808e5912',
  role: 'member',
};

let loggedInUser = null;

const ensureLoggedIn = (req, res, next) => {
  req.user = testUser;
  if (req.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

const passportInitialize = (req, res, next) => { next(); };
const passportSession = (req, res, next) => {
  req.user = loggedInUser;
  next();
};

const login = (vendor, req, res, next) => {
  if (req.query.code) {
    next();
  } else {
    res.redirect(`/login/${vendor}/return?code=111`);
  }
};

const users = {
  log: sinon.stub(),
  setDB: sinon.stub(),
  initialize: () => passportInitialize,
  session: () => passportSession,
  authenticate: vendor => login.bind(null, vendor),
};
users.log.resolves();

const mail = {
  send: sinon.stub(),
};

let newMedia = null;
let newLine = null;

function Revision(db) {
  function onUpdateRequest(target, req) {
    const queryObj = { _id: ObjectId(req.params.forID) };
    const updateObj = {
      $currentDate: { lastModified: true },
      $set: req.body.changes,
      $inc: { version: 1 },
    };

    return db.collection(target)
      .findOneAndUpdate(queryObj, updateObj, { returnOriginal: false })
      .then(result => result.value);
  }

  this.execute = onUpdateRequest;
}

require('dotenv').config();

APP.__Rewire__('ensureLoggedIn', () => ensureLoggedIn);
APP.__Rewire__('users', users);
APP.__Rewire__('mail', mail);
APP.__Rewire__('Revision', Revision);
APP.__Rewire__('DB_URL', process.env.TEST_DB_URL);

describe.only('app.js', () => {
  let server;
  let env;
  let db;

  before(function () {
    const skip = this.skip;
    return APP().then((result) => {
      server = result.server;
      env = result.env;
      db = result.db;
    }).catch((error) => {
      skip();
    });
  });

  after(function (done) {
    // this.timeout(1000);
    const time = process.hrtime();
    console.log(time);
    db.collections().then(function (collections) {
      const deletions = [];
      collections.forEach((c) => {
        if (!c.collectionName.startsWith('system.')) {
          console.log(`deleting ${c.collectionName}`);
          deletions.push(db.dropCollection(c.collectionName));
        }
      });

      Promise.all(deletions).then(() => db.close).then(() => {
        const diff = process.hrtime(time);
        console.log(`Deleting all took ${(diff[0] * 1e3) + (diff[1] / 1e6)} miliseconds`);
        server.close(done);
      }).catch(done);
    });
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

    it('can handle db connection failure', function () {
      //  will throw EADDRINUSE error
      return APP().catch((err) => {
        expect(err).to.be.null;
      });
    });
  });

  describe('post requests- ', function () {
    let changeset;
    let newMedia2;

    it('POST /api/media/new should fail for unauthorized user', function () {
      newMedia = {
        title: 'Thriller',
        artist: 'Michael Jackson',
        type: 1,
      };

      return request(server)
        .post('/api/media/new')
        .send(newMedia)
        .expect(403);
    });

    it('POST /api/media/new should add new song', function () {
      testUser.role = 'admin';

      return request(server)
        .post('/api/media/new')
        .send(newMedia)
        .expect(200)
        .then((res) => {
          expect(res.text).to.equal('Thriller');
        });
    });

    it('POST /api/media/new should add another song', function () {
      newMedia2 = {
        title: 'Lucky',
        artist: 'Brittney Spears',
        type: 0,
      };

      return request(server)
        .post('/api/media/new')
        .send(newMedia2)
        .expect(200);
    });

    it('responds to /music/:slug (for video)', function () {
      return request(server)
        .get('/music/Thriller')
        .expect(200)
        .then(function (res) {
          $ = cheerio.load(res.text);
          expect($('nav').length).to.equal(1);
          expect($('#root').length).to.equal(1);

          // to do: not necessary. can use api request to get _id
          const re = /JSON.parse\('({.*?})'.+\)/;
          const matches = res.text.match(re);
          if (!matches) {
            throw new Error('could not find props data sent from server');
          }

          const props = JSON.parse(matches[1]);
          expect(props.title).to.equal(newMedia.title);
          expect(props.canEdit).to.be.false;
          newMedia._id = props.mediaID;
        });
    });

    it('responds to /music/:slug with edit priveledges (and for audio)', function () {
      loggedInUser = {
        isAdmin: true,
      };

      return request(server)
        .get('/music/Lucky')
        .expect(200)
        .then(function (res) {
          loggedInUser = null;

          const re = /JSON.parse\('({.*?})'.+\)/;
          const matches = res.text.match(re);
          if (!matches) {
            throw new Error('could not find props data sent from server');
          }

          const props = JSON.parse(matches[1]);
          expect(props.title).to.not.equal(newMedia.title);
          expect(props.title).to.equal(newMedia2.title);
          expect(props.canEdit).to.be.true;
          newMedia2._id = props.mediaID;
        });
    });

    it('should start edit session', function () {
      return request(server)
        .post(`/api/start_edit/${newMedia._id}`)
        .expect(200)
        .then(function (res) {
          expect(res.text).to.be.a('string');
          expect(res.text).not.to.be.empty;
          changeset = res.text;
        });
    });

    it('POST /api/media/edit/:forID to edit lyric', function () {
      const mediaChange = {
        startTime: 0,
      };

      return request(server)
        .post(`/api/media/edit/${newMedia._id}`)
        .send({
          changes: mediaChange,
          changeset,
          mediaID: newMedia._id,
        })
        .expect(200)
        .then((res) => {
          expect(res.body.startTime).to.equal(mediaChange.startTime);
          expect(res.body.startTime).not.to.equal(newMedia.startTime);
          newMedia.startTime = mediaChange.startTime;
        });
    });

    it('POST /api/media/edit/:forID. should update slug', function () {
      const mediaChange = {
        title: 'Bad',
      };

      return request(server)
        .post(`/api/media/edit/${newMedia._id}`)
        .send({
          changes: mediaChange,
          changeset,
          mediaID: newMedia._id,
        })
        .expect(200)
        .then((res) => {
          expect(res.body.title).to.equal(mediaChange.title);
          expect(res.body.title).not.to.equal(newMedia.title);
          expect(res.body.slug).to.equal('Bad');
          newMedia.title = mediaChange.title;
        });
    });

    it('POST /api/media/:mediaID/addline', function () {
      newLine = {
        startTime: 5,
        endTime: 6,
        text: 'whoever you are. girl, bye',
        deleted: false,
        changeset,
      };

      return request(server)
        .post(`/api/media/${newMedia._id}/addline`)
        .send(newLine)
        .expect(200)
        .then((res) => {
          expect(res.body).to.be.an('array');
          const thisLine = res.body[0];
          expect(thisLine.text).to.equal(newLine.text);
          newLine._id = thisLine._id;
        });
    });

    it('POST /api/lines/edit/:forID', function () {
      const lineChange = {
        text: 'bye bye, bye',
      };

      return request(server)
        .post(`/api/lines/edit/${newLine._id}`)
        .send({
          changes: lineChange,
          changeset,
          mediaID: newMedia._id,
        })
        .expect(200)
        .then((res) => {
          expect(res.body).to.be.an('array');
          const thisLine = res.body[0];
          expect(thisLine.text).to.equal(lineChange.text);
          expect(thisLine.text).not.to.equal(newLine.text);
          newLine.text = lineChange.text;
        });
    });

    it('should return two lines, after adding a second');
  });

  describe('get requests- ', function () {
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
        .get('/music/Bad/history')
        .expect(200);
    });

    it('responds to /music/:slug/history when not found', function () {
      return request(server)
        .get('/music/Adamsfs/history')
        .expect(404);
    });

    it('redirects /history when not logged in ', function () {
      const temp = testUser;
      testUser = null;
      return request(server)
        .get('/history')
        .expect(302)
        .then(() => {
          testUser = temp;
        });
    });

    it('serves /history for authenticated user ', function () {
      return request(server)
        .get('/history')
        .expect(200);
    });
  });

  describe('ajax requests- ', function () {
    before(function () {
      // automatically authorize request
      // app.use();
    });

    it('/api/changesets/list', function () {
      return request(server)
        .get('/api/changesets/list?user')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
        });
    });

    it('/api/changesets/list', function () {
      return request(server)
        .get('/api/changesets/list?media=58e638a2d300e060f9cdd6ca')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
        });
    });

    it('/api/changesets/list', function () {
      return request(server)
        .get('/api/changesets/list?media=58e638a2d300e060f9cdd6ca&from=58eb3cceb1dd4ced9f759083')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
        });
    });

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

    it('/api/media', function () {
      return request(server)
        .get('/api/media?changeset=58e745c92f1435db632f81f9')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('object');
        });
    });

    it('/api/revisions', function () {
      return request(server)
        .get('/api/revisions?changeset=58e745c92f1435db632f81f9')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
        });
    });

    it('/api/myLines renders for logged in user', function () {
      return request(server)
        .get('/api/myLines?changeset=58e745c92f1435db632f81f9')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
        });
    });

    it('/api/lines', function () {
      return request(server)
        .get('/api/lines/58e638a2d300e060f9cdd6ca')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
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

    it('/api/media/:mediaID', function () {
      return request(server)
        .get('/api/media/58e638a2d300e060f9cdd6ca')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('object');
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
        .get('/api/media/----')
        .expect(500);
    });
  });

  describe('authorization routing', function () {
    it('should redirect anonymous user to login for restricted page', function () {
      testUser.role = 'member';
      return request(server)
        .get('/new_music')
        .expect(403);
    });

    it('should permit admin user to add new music', function () {
      testUser.role = 'admin'; // to do: restore
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

  it('distinguisehs between two media with the same title/slug');

  it('never loads deleted songs');

  it('does not allow editing of stale line');

  it('redirects to original page after sign in');

  it('stores all numbers as numbers instead of strings');

  it('updates url/slug when title changes');

  it('does not allow title/slug changes after a certain number of views');

  it('maintais daily count of views');

  it('cleans up sessions');

  it('clears failed revisions');

  it('youtube source url always has matching protocol');

  it('manages sessions');
});
