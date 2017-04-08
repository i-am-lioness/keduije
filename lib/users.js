var ObjectId = require('mongodb').ObjectId;
var FacebookStrategy = require('passport-facebook').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;

var twCallbackURL = process.env.HOST + "/login/twitter/return";
var fbCallbackURL = process.env.HOST + "/login/facebook/return";

module.exports = function(passport){
  var db;

  function setDB(_db){
    db=_db;
  }

function getTwitterUser(twitterProfile, cb){
  db.collection('users').findAndModify(
    { twitterID: twitterProfile.id } ,
    null,
    { $setOnInsert:
      {
        twitterID: twitterProfile.id,
        displayName: twitterProfile.username,
        photo: twitterProfile.photos[0].value, //todo: make sure it exists
        role: "member"
      },
    $set: {
      lastLogin: new Date()
      }
    },
    { upsert: true },
    function(err, result) {
      cb(err,result.value);
    }
  );
}

function getFacebookUser(facebookProfile, cb){
  db.collection('users').findAndModify(
     { facebookID: facebookProfile.id } ,
     null,
     { $setOnInsert: { facebookID: facebookProfile.id,
                displayName: facebookProfile.displayName,
                role: "member",
                photo: "http://graph.facebook.com/v2.8/" + facebookProfile.id + "/picture"
      },
       $set: {
         lastLogin: new Date(),
       }
     },
     { upsert: true },
     function(err, result) {
       cb(err,result.value);
     }
  );
}

function getUser(userID, cb){
  db.collection('users').findOne(
    { _id: new ObjectId(userID) },
    function (err, result){
      cb(err,result);
    });
}

passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: fbCallbackURL
  },
  function(accessToken, refreshToken, profile, cb) {
    getFacebookUser(profile, cb);
  }
));

passport.use(new LocalStrategy(
  function(username, password, done) {
    if(username=="yc"){
      db.collection('users').findAndModify(
         { username: "yc" } , null,
         {
           $set: {
             lastLogin: new Date(),
           }
         },
         null,
         function(err, result) {
           done(err,result.value);
         }
      );
    }else{
      return done(null, false, { message: 'Incorrect username.' });
    }
  }
));

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: twCallbackURL
  },
  function(token, tokenSecret, profile, cb) {
    getTwitterUser(profile, cb);
  }
));

passport.serializeUser(function(user, cb) {
  cb(null, user._id);
});

passport.deserializeUser(function(id, cb) {
  getUser(id, cb);
});

function logUser(req, cb){
  if(req.xhr) return; //do not log ajax requests
  if(req.path.startsWith("/logout")) return;
  if(req.path.startsWith("/login")){
    if(req.path!="/login/yc") return;
  }

  var user = (req.user)? req.user.displayName : "anonymous";
  if (user=="Nnenna Ude") return;
  if ((user!="yc")&&(req.ip == process.env.DEVELOPER_IP)) return; //do not log local requests

  var record = {
    user: user,
    host: req.hostname,
    path: req.path,
    from: req.ip,
    date: (new Date().toString())
  };

  db.collection("logs").insertOne(record);

  cb(JSON.stringify(record));

}


function requireRole(role) {
  return function(req, res, next) {
    if(req.user && req.user.role === role)
      next();
    else
      res.sendStatus(403);
    }
}



  return {
    setDB: setDB,
    log: logUser,
    require: requireRole
  };

};