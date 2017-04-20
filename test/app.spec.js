/* eslint-env mocha */
import { expect } from 'chai';
import request from 'supertest';
import APP from '../lib/app';

const testUser = {
  // _id: '58f2e137f36d287eae034c5f',
  _id: '58e451206b5df803808e5912',
  role: 'member',
};

const autoAuthenticate = (req, res, next) => {
  req.user = testUser;
  next();
};

const dummyMiddleware = (req, res, next) => { next(); };

const login = (req, res, next, vendor) => {
  if (req.query.code) {
    next();
  } else {
    res.redirect(`/login/${vendor}/return?code=111`);
  }
};

const ensureLoggedIn = () => autoAuthenticate;

const passport = {
  initialize: () => autoAuthenticate,
  session: () => dummyMiddleware,
  authenticate: vendor => login.bind(null, vendor),
};

APP.__Rewire__('ensureLoggedIn', ensureLoggedIn);
APP.__Rewire__('passport', passport);

describe('app.js', () => {
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
      .end(function (res) {
        expect(res.body).to.be.an('object');
      });
  });

  it('responds to /music/:slug when not found', function () {
    return request(server)
      .get('/music/Adamsfs')
      .expect(404)
      .end(function (res) {
        expect(res.text).to.equal('not found');
      });
  });

  describe('ajax requests- ', function () {
    before(function () {
      // automatically authorize request
      // app.use();
    });

    it('/api/changesets/list', function () {
      return request(server)
        .get('/api/changesets/list')
        .expect(200)
        .then(function (res) {
          expect(res.body).to.be.an('array');
        });
    });
  });

  it.skip('[internal]counts views for songs', function () {
    return request(server)
      .get('/music/Ada')
      .expect(200)
      .then(function (res) {
        expect(res.body).to.be.an('object');

        const count = res.body.views;
        return request(server)
          .get('/music/Ada')
          .expect(200)
          .then(function (res2) {
            expect(res2.body.views).to.equal(count + 1);
          });
      });
  });

  describe('authorization', function () {
    it('should redirect anonymous user to login for restricted page', function () {
      return request(server)
        .get('/new_music')
        .expect(403)
        .then(function (res) {
          expect(res).to.redirect;
        });
    });

    describe.skip('with admin user', function () {
      beforeEach(function (done) {
        request(server)
          .post('/login/test')
          .field('username', 'test-admin')
          .field('password', 'pw')
          .then(function (res) {
            debugger;
            expect(res).to.redirectTo('/');
            done();
          })
          .catch((error) => {
            debugger;
            // console.log(error);
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
            debugger;
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
