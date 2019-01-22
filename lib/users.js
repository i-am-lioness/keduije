import { tables } from './constants';

const passport = require('passport');
const ObjectId = require('mongodb').ObjectId;
const Db = require('mongodb').Db;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;


let db;
let env;

function authenticate(strategy) {
  return passport.authenticate(strategy, { failureRedirect: '/login' });
}

function getGoogleUser(googleProfile, cb) {
  const googleID = googleProfile.id;
  db(tables.USERS).findOneAndUpdate(
    { googleID },
    { $setOnInsert: {
      googleID,
      displayName: googleProfile.displayName,
      photo: googleProfile.photos[0].value,
      role: 'member',
    },
      $set: {
        lastLogin: new Date(),
      },
    },
    {
      upsert: true,
    },
  (err, result) => {
    cb(err, result.value);
  });
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
    return Promise.resolve(null);
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

function initialize(app, _db, _env) {
  db = _db;
  env = _env;

  if (!((db._DB && db._DB.constructor === Db))) throw new Error('Invalid _db provided');
  if (!(_env)) throw new Error('Invalid _env provided');

  const twCallbackURL = `${env.HOST}/login/twitter/return`;
  const fbCallbackURL = `${env.HOST}/login/facebook/return`;
  const googleCallbackURL = `${env.HOST}/login/google/return`;

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

  passport.use(new LocalStrategy(
    (username, password, done) => {
      debugger;
      getUser('59614531af46ede75bc56924', done);
    }
  ));

  passport.use(new GoogleStrategy({
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL: googleCallbackURL,
  },
  (accessToken, refreshToken, profile, cb) => {
    getGoogleUser(profile, cb);
  }
));

  passport.serializeUser((user, cb) => {
    cb(null, user._id);
  });

  passport.deserializeUser((id, cb) => {
    getUser(id, cb);
  });

  app.use(passport.initialize());
  app.use(passport.session());

  const setPostLoginRedirect = (req, res, next) => {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    next();
  };

  const vendors = ['Facebook', 'Google', 'Twitter'];

  vendors.forEach((vendor) => {
    const strategy = vendor.toLowerCase();

    const authenticateOpts = { failureRedirect: '/login' };
    if (vendor === 'Google') authenticateOpts.scope = ['profile'];
    const authenticator = passport.authenticate(strategy, authenticateOpts);
    app.get(`/login/${strategy}`, setPostLoginRedirect, authenticator);

    app.get(`/login/${strategy}/return`,
    authenticator,
      (req, res) => {
        res.redirect(req.session.returnTo || '/');
      }
    );
  });

  const buttons = vendors.map((vendor) => {
    const strategy = vendor.toLowerCase();
    return `<a href="/login/${strategy}">Login with ${vendor}</a>`;
  });

  const loginPage = buttons.join('<br />');
  app.get('/login',
  (req, res) => {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    res.send(loginPage);
  }
  );


  app.get('/login/auto', (req, res, next) => {
    debugger;
    if (env.AUTO_LOGIN === '1') {
      req.body = { username: 'x', password: 'x' };
      next();
    } else {
      res.status(403).send('Login disabled.');
    }
  }, passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    debugger;
    res.redirect(req.session.returnTo || '/');
  });

  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect(req.header('Referer') || '/');
  });
}

module.exports = () => ({
  log,
  initialize,
  authenticate,
  // session: passport.session.bind(passport),
});
