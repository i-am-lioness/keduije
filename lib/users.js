const ObjectId = require('mongodb').ObjectId;
const FacebookStrategy = require('passport-facebook').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;

const twCallbackURL = `${process.env.HOST}/login/twitter/return`;
const fbCallbackURL = `${process.env.HOST}/login/facebook/return`;

module.exports = (passport) => {
  let db;

  function setDB(_db) {
    db = _db;
  }

  function getTwitterUser(twitterProfile, cb) {
    db.collection('users').findAndModify(
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
    db.collection('users').findAndModify(
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
    db.collection('users').findOne(
      { _id: new ObjectId(userID) },
      (err, result) => {
        cb(err, result);
      });
  }

  passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: fbCallbackURL,
  },
    (accessToken, refreshToken, profile, cb) => {
      getFacebookUser(profile, cb);
    }
  ));

  passport.use(new LocalStrategy(
    (username, password, done) => {
      debugger;
      db.collection('users').findAndModify(
        { username: username }, null,
        {
          $set: {
            lastLogin: new Date(),
          },
        },
        null,
        (err, result) => {
          debugger;
          console.log(`result: ${result}\n err: ${err}`);
          if (err) {
            done(null, false, { message: 'Incorrect username.' });
          } else {
            done(err, result.value);
          }
        }
      );
    }
  ));

  passport.use(new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
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

  function logUser(req, cb) {
    if (req.xhr) return; // do not log ajax requests
    if (req.path.startsWith('/logout')) return;
    if (req.path.startsWith('/login')) {
      if (req.path !== '/login/yc') return;
    }

    const user = (req.user) ? req.user.displayName : 'anonymous';
    if (user === 'Nnenna Ude') return;
    if ((user !== 'yc') && (req.ip === process.env.DEVELOPER_IP)) return; // do not log local requests

    const record = {
      user,
      host: req.hostname,
      path: req.path,
      from: req.ip,
      date: (new Date().toString()),
    };

    db.collection('logs').insertOne(record);

    cb(JSON.stringify(record));
  }


  function requireRole(role) {
    return (req, res, next) => {
      if (req.user && req.user.role === role) {
        next();
      } else {
        res.sendStatus(403);
      }
    };
  }

  return {
    setDB: setDB,
    log: logUser,
    require: requireRole,
  };
};
