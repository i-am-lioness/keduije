import { tables } from './constants';

const passport = require('passport');
const ObjectId = require('mongodb').ObjectId;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;

module.exports = () => {
  let db;
  let env;

  function authenticate(strategy) {
    return passport.authenticate(strategy, { failureRedirect: '/login' });
  }

  function getTwitterUser(twitterProfile, cb) {
    db(tables.USERS).findAndModify(
      { twitterID: twitterProfile.id },
      null,
      { $setOnInsert: {
        twitterID: twitterProfile.id,
        displayName: twitterProfile.username,
        photo: twitterProfile.photos[0].value, // todo: make sure it exists
        role: 'member',
      },
        $set: {
          lastLogin: new Date(),
        },
      },
      { upsert: true },
      (err, result) => {
        cb(err, result.value);
      }
    );
  }

  function getFacebookUser(facebookProfile, cb) {
    db(tables.USERS).findAndModify(
      { facebookID: facebookProfile.id },
      null,
      {
        $setOnInsert: {
          facebookID: facebookProfile.id,
          displayName: facebookProfile.displayName,
          role: 'member',
          photo: `http://graph.facebook.com/v2.8/${facebookProfile.id}/picture`,
        },
        $set: {
          lastLogin: new Date(),
        },
      },
      { upsert: true },
      (err, result) => {
        cb(err, result.value);
      }
    );
  }

  function getUser(userID, cb) {
    db(tables.USERS).findOne(
      { _id: new ObjectId(userID) },
      (err, result) => {
        cb(err, result);
      });
  }

  function log(req) {
    return new Promise((resolve, reject) => {
      // do not log ajax requests
      if (req.xhr) return;
      // do not log local requests unless it is for /log (as a sanity check)
      if ((req.ip === env.DEVELOPER_IP) && (req.path !== '/log')) return;

      const record = {
        user: (req.user) ? req.user.displayName : 'anonymous',
        host: req.hostname,
        path: req.path,
        from: req.ip,
        date: (new Date().toString()),
      };

      db(tables.LOGS).insertOne(record).then(() => {
        resolve(JSON.stringify(record));
      });
    });
  }

  // to test: insure that a _db is passed
  function initialize(_db, _env) {
    db = _db;
    env = _env;

    const twCallbackURL = `${env.HOST}/login/twitter/return`;
    const fbCallbackURL = `${env.HOST}/login/facebook/return`;

    passport.use(new FacebookStrategy({
      clientID: env.FB_CLIENT_ID,
      clientSecret: env.FB_CLIENT_SECRET,
      callbackURL: fbCallbackURL,
    },
      (accessToken, refreshToken, profile, cb) => {
        getFacebookUser(profile, cb);
      }
    ));

    passport.use(new TwitterStrategy(
      {
        consumerKey: env.TWITTER_CONSUMER_KEY,
        consumerSecret: env.TWITTER_CONSUMER_SECRET,
        callbackURL: twCallbackURL,
      },
      (token, tokenSecret, profile, cb) => {
        getTwitterUser(profile, cb);
      }
    ));

    passport.serializeUser((user, cb) => {
      cb(null, user._id);
    });

    passport.deserializeUser((id, cb) => {
      getUser(id, cb);
    });

    return passport.initialize();
  }

  return {
    log,
    initialize,
    authenticate,
    session: passport.session.bind(passport),
  };
};
