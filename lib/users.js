import { tables } from './constants';

const passport = require('passport');
const ObjectId = require('mongodb').ObjectId;
const Db = require('mongodb').Db;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;


let db;
let env;

function authenticate(strategy) {
  return passport.authenticate(strategy, { failureRedirect: '/login' });
}

function getTwitterUser(twitterProfile, cb) {
  db(tables.USERS).findOneAndUpdate(
    { twitterID: twitterProfile.id },
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
    {
      upsert: true,
      // returnOriginal: false,
    },
  (err, result) => {
    cb(err, result.value);
  });
}


function getFacebookUser(facebookProfile, cb) {
  db(tables.USERS).findOneAndUpdate(
    { facebookID: facebookProfile.id },
    { $setOnInsert: {
      facebookID: facebookProfile.id,
      displayName: facebookProfile.displayName,
      role: 'member',
      photo: `http://graph.facebook.com/v2.8/${facebookProfile.id}/picture`,
    },
      $set: {
        lastLogin: new Date(),
      },
    },
    {
      upsert: true,
      // returnOriginal: false,
    },
    (err, result) => {
      cb(err, result.value);
    });
}

function getUser(userID, cb) {
  db(tables.USERS).findOne(
    { _id: new ObjectId(userID) },
    (err, result) => {
      cb(err, result);
    });
}

function log(req) {
  // do not log ajax requests or local requests unless it is for /log (as a sanity check)
  if ((req.xhr) || ((req.ip === env.DEVELOPER_IP) && (req.path !== '/log'))) {
    return Promise.resolve();
  }

  const record = {
    user: (req.user) ? req.user.displayName : 'anonymous',
    host: req.hostname,
    path: req.path,
    from: req.ip,
    date: (new Date().toString()),
  };

  return db(tables.LOGS).insertOne(record).then(() => JSON.stringify(record));
}

function initialize(_db, _env) {
  db = _db;
  env = _env;

  if (!((db._DB && db._DB.constructor === Db))) throw new Error('Invalid _db provided');
  if (!(_env)) throw new Error('Invalid _env provided');

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

module.exports = () => ({
  log,
  initialize,
  authenticate,
  session: passport.session.bind(passport),
});
