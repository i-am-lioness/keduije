/* eslint-env mocha */
import { expect } from 'chai';
import sinon from 'sinon';
import usersModule from '../lib/users';
import TestDB from './utils/db';
import { mockDB } from './utils/mocks';

const twitterProfile = {
  id: '123',
  username: 'yemi',
  photos: ['me.jpg'],
};
const facebookProfile = {
  id: '123',
  username: 'yemi',
  photos: ['me.jpg'],
};

const profiles = {
  twitter: twitterProfile,
  facebook: facebookProfile,
};

const strategies = {};

let serialize;
let deserialize;

function passportAuthenticate(strategyName) {
  function authenticator() {
    return new Promise((resolve, reject) => {
      const onSuccess = strategies[strategyName]._verify;
      const profile = profiles[strategyName];

      const cb = (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      };
      if (strategyName === 'local') {
        onSuccess(null, null, cb);
      } else {
        onSuccess(null, null, profile, cb);
      }
    });
  }
  return authenticator;
}

function passportUse(strategy) {
  strategies[strategy.name] = strategy;
}

const passport = {
  authenticate: sinon.stub(),
  use: sinon.stub(),
  serializeUser: sinon.stub(),
  deserializeUser: sinon.stub(),
  initialize: sinon.stub(),
  session: sinon.stub(),
};
passport.use.callsFake(passportUse);
passport.authenticate.callsFake(passportAuthenticate);
passport.serializeUser.callsFake((fn) => {
  serialize = fn;
});
passport.deserializeUser.callsFake((fn) => {
  deserialize = fn;
});

let db;

describe('users.js', function () {
  let users;

  before(function () {
    usersModule.__Rewire__('passport', passport);
    users = usersModule();
    return TestDB.open().then(function (database) {
      db = database;
    });
  });

  after(function () {
    usersModule.__ResetDependency__('passport');
    return TestDB.close();
  });

  // ✓ GOOD
  it('should provide expected functions', function () {
    expect(users).to.have.all.keys(['log', 'initialize', 'authenticate', 'session']);
    expect(users.log).to.be.a('function');
    expect(users.initialize).to.be.a('function');
    expect(users.authenticate).to.be.a('function');
    expect(users.session).to.be.a('function');
  });

  describe('initalization', function () {
    afterEach(function () {
      passport.initialize.resetHistory();
    });

    // ✓ GOOD
    it('should initialize passport', function () {
      users.initialize(db, process.env);
      expect(passport.initialize.called).to.be.true;
    });

    // ✓ GOOD
    it('fails if no db provided', function () {
      const func = () => { users.initialize({}, process.env); };
      expect(func).to.throw('Invalid _db provided');
      expect(passport.initialize.called).to.be.false;
    });

    // ✓ GOOD
    it('fails if no env provided ', function () {
      const func = () => { users.initialize(db, null); };
      expect(func).to.throw('Invalid _env provided');
      expect(passport.initialize.called).to.be.false;
    });
  });

  describe('log', function () {
    const displayName = 'Osadebe';
    let req;

    before(function () {
      mockDB._DB = db._DB;
      users.initialize(mockDB, process.env);
    });

    beforeEach(function () {
      req = {
        xhr: false,
        ip: 'x',
        user: { displayName },
        path: '/uzo',
        hostname: 'kezie',
      };
    });

    afterEach(function () {
      mockDB.reset();
    });

    // ✓ GOOD
    it('logs request', function () {
      return users.log(req).then((recordStr) => {
        const record = JSON.parse(recordStr);
        expect(record).to.be.an('object');
        expect(record).to.have.ownProperty('date');
        expect(record.user).to.equal(displayName);
        expect(record.host).to.equal(req.hostname);
        expect(record.path).to.equal(req.path);
        expect(record.from).to.equal(req.ip);
        expect(mockDB().insertOne.called).to.be.true;
      });
    });

    // ✓ GOOD
    it('logs request for anonymous user', function () {
      req.user = null;
      return users.log(req).then((recordStr) => {
        const record = JSON.parse(recordStr);
        expect(record).to.be.an('object');
        expect(record).to.have.ownProperty('date');
        expect(record.user).to.equal('anonymous');
        expect(record.host).to.equal(req.hostname);
        expect(record.path).to.equal(req.path);
        expect(record.from).to.equal(req.ip);
      });
    });

    // ✓ GOOD
    it('does not log ajax requests', function () {
      req.xhr = true;
      return users.log(req).then(() => {
        expect(mockDB().insertOne.called).to.be.false;
      });
    });

    // ✓ GOOD
    it('does not log local requests', function () {
      req.ip = process.env.DEVELOPER_IP;
      return users.log(req).then(() => {
        expect(mockDB().insertOne.called).to.be.false;
      });
    });

    // ✓ GOOD
    it('logs "/log" request even when on developer IP', function () {
      req.path = '/log';
      req.ip = process.env.DEVELOPER_IP;
      return users.log(req).then(() => {
        expect(mockDB().insertOne.called).to.be.true;
      });
    });
  });

  describe('authenticate', function () {
    before(function () {
      users.initialize(db, process.env);
    });

    afterEach(function () {
      passport.authenticate.resetHistory();
    });

    // ✓ GOOD
    it('should honor respective strategy', function () {
      const strategyName = 'bbm';
      users.authenticate(strategyName);
      expect(passport.authenticate.lastCall.args[0]).to.equal(strategyName);
      expect(passport.authenticate.lastCall.args[1]).to.deep.equal({ failureRedirect: '/login' });
    });

    ['twitter', 'facebook'].forEach((provider) => {
      describe(`for ${provider}`, function () {
        let user;
        const strategyName = provider;

        before(function () {
          const a = users.authenticate(strategyName);
          return a().then((_user) => {
            user = _user;
          });
        });

        // ✓ GOOD
        it('should register new user', function () {
          expect(user).to.equal(null);
        });

        // ✓ GOOD
        it('should login registered user', function () {
          const a = users.authenticate(strategyName);
          return a().then((registeredUser) => {
            expect(registeredUser).to.be.ok;
            expect(registeredUser).to.haveOwnProperty('_id');
          });
        });
      }); // describe(`for ${provider}`)
    }); // ['twitter', 'facebook'].forEach

    describe('auto login for dev mode', function () {
      let user;
      let err;
      let a;
      before(function () {
        process.env.AUTO_LOGIN = '1';
        a = users.authenticate('local');
        return a().then((_user) => {
          user = _user;
        }).catch((_err) => {
          err = _err;
        });
      });

      afterEach(function () {
        process.env.AUTO_LOGIN = null;
      });

      it('should not throw error', function () {
        expect(err).to.be.undefined;
      });

      it('should fail when AUTO_LOGIN not set', function () {
        return a().catch((_err) => {
          err = _err;
          expect(err.message).to.equal('auto login disabled');
        });
      });
    });

    describe('for sessions', function () {
      const userA = {
        photo: 'hi.jpg',
      };

      before(function () {
        users.initialize(db, process.env);
        return db('users').insertOne(userA);
      });

      // ✓ GOOD
      it('should serialize', function () {
        serialize(userA, (err, serializedUser) => {
          expect(serializedUser).to.equal(userA._id);
        });
      });

      // ✓ GOOD
      it('should deserialize', function () {
        deserialize(userA._id.toString(), (err, userObj) => {
          expect(userObj).to.deep.equal(userA);
        });
      });
    });
  });

  /*
  it('[INTEGRATION] redirects to facebook, for facebook strategy');

  it('[INTEGRATION] redirects to original page after sign in');

  it('[INTEGRATION] successfully logs in via facebook');

  it('cleans up sessions');

  it('manages sessions');
  */
});
