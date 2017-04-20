/* eslint-env mocha */
import { expect } from 'chai';
import request from 'supertest';
import cheerio from 'cheerio';
import sinon from 'sinon';
import APP from '../lib/app';

let $;

const testUser = {
  // _id: '58f2e137f36d287eae034c5f',
  _id: '58e451206b5df803808e5912',
  role: 'member',
};

const autoAuthenticate = (req, res, next) => {
  req.user = testUser;
  next();
};

// const dummyMiddleware = (req, res, next) => { next(); };
const passportInitialize = (req, res, next) => { next(); }; // for debugging purposes
const passportSession = (req, res, next) => { next(); }; // for debugging purposes

const login = (vendor, req, res, next) => {
  if (req.query.code) {
    next();
  } else {
    res.redirect(`/login/${vendor}/return?code=111`);
  }
};

const ensureLoggedIn = () => autoAuthenticate;

const passport = {
  initialize: () => passportInitialize,
  session: () => passportSession,
  authenticate: vendor => login.bind(null, vendor),
};

const users = {
  log: sinon.stub(),
  setDB: sinon.stub(),
};
users.log.callsArg(1);

const mail = {
  send: sinon.stub(),
};

APP.__Rewire__('ensureLoggedIn', ensureLoggedIn);
APP.__Rewire__('passport', passport);
APP.__Rewire__('users', users);
APP.__Rewire__('mail', mail);

describe.only('app.js', () => {
  let server;
  let env = null;
  let app = null;

  before(function () {
    const skip = this.skip;
    return APP().then((result) => {
      server = result.server;
      env = result.env;
      app = result.app;
    }).catch((error) => {
      console.log(error);
      skip();
    });
  });

  after(function (done) {
    server.close(done);
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
  });

  it('responds to /', function () {
    return request(server)
      .get('/')
      .expect(200);
  });

  it('responds to /music/:slug', function () {
    return request(server)
      .get('/music/Ada')
      .expect(200)
      .then(function (res) {
        $ = cheerio.load(res.text);
        expect($('nav').length).to.equal(1);
        expect($('#root').length).to.equal(1);
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
      .get('/music/Ada/history')
      .expect(200);
  });

  it('responds to /music/:slug/history when not found', function () {
    return request(server)
      .get('/music/Adamsfs/history')
      .expect(404);
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
  });

  describe('authorization routing', function () {
    it('should redirect anonymous user to login for restricted page', function () {
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


    describe.skip('with admin user', function () {
      beforeEach(function (done) {
        request(server)
          .post('/login/test')
          .field('username', 'test-admin')
          .field('password', 'pw')
          .then(function (res) {
            expect(res).to.redirectTo('/');
            done();
          })
          .catch((error) => {
            done();
          });
      });

      it('allows admin to enter restricted page', function (done) {
        request(server)
          .get('/new_music')
          .then(function (res) {
            expect(res).to.have.status(200);
            done();
          });
      });
    });
  });

  describe.skip('with non-admin user', function () {
      before(function (done) {
        request(app)
          .post('/login/test')
          .field('username', 'test')
          .field('password', 'pw')
          .then(function (res) {
            console.log(res);
            expect(res).to.redirectTo('/');
            done();
          });
      });

    it.skip('should forbid non admin from adding new music', function (done) {
      request(server)
      .get('/new_music')
      .then(function (res) {
        expect(res).to.have.status(403);
        done();
      });
    });
  });

  it('distinguisehs between two media with the same title/slug');

  it('never loads deleted songs');

  it('does not allow editing of stale line');

  it('redirects to original page after sign in');

  it('can login user via twitter');

  it('stores all numbers as numbers instead of strings');

  it('updates url/slug when title changes');

  it('does not allow title/slug changes after a certain number of views');

  it('maintais daily count of views');

  it('cleans up sessions');

  it('clears failed revisions');

  it('renders media player on server');

  it('youtube source url always has matching protocol');
});
