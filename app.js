require('dotenv').config()
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');
var express = require('express');
var app = express();
const bodyParser= require('body-parser');
var cors = require('cors')
var path = require('path');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var ObjectId = require('mongodb').ObjectId;
const pug = require('pug');
const compiledFunction = pug.compileFile('views/lyricsDisplay.pug');

var twCallbackURL = process.env.DEV ?
  'http://localhost:3000/login/twitter/return'
  : 'http://keduije1.herokuapp.com/login/twitter/return';

  function getTwitterUser(twitterProfile, cb){
    //console.log("twitterProfile", twitterProfile);

    database.collection('users').findAndModify(
       { twitterID: twitterProfile.id } ,
       { twitterID: -1 },
       { $setOnInsert: { twitterID: twitterProfile.id,
                  displayName: twitterProfile.username,
                  photo: twitterProfile.photos[0].value, //todo: make sure it exists
                  role: "member"
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



var fbCallbackURL = process.env.DEV ?
  'http://localhost:3000/login/facebook/return'
  : 'http://keduije1.herokuapp.com/login/facebook/return';
var database;

function getFacebookUser(facebookProfile, cb){
  database.collection('users').findAndModify(
     { facebookID: facebookProfile.id } ,
     { facebookID: -1 },
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
  database.collection('users').findOne(
    { _id: new ObjectId(userID) },
    function (err, result){
      console.log("result", result);
      cb(err,result);
    });
}

passport.use(new Strategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: fbCallbackURL
  },
  function(accessToken, refreshToken, profile, cb) {
    getFacebookUser(profile, cb);
  }
));

passport.serializeUser(function(user, cb) {
  cb(null, user._id);
});

passport.deserializeUser(function(id, cb) {
  getUser(id, cb);
});

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'pug')


app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('react'));

app.use(require('cookie-parser')());
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));


app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next){
  res.locals.user = req.user;
  res.locals.title = "KeduIje?"
  //res.locals.authenticated = ! req.user.anonymous;
  next();
});

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: twCallbackURL
  },
  function(token, tokenSecret, profile, cb) {
    getTwitterUser(profile, cb);
  }
));

app.get('/login/twitter',
  passport.authenticate('twitter'));

app.get('/login/twitter/return',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect(req.session.returnTo || "/");
  });


function requireRole(role) {
    return function(req, res, next) {

        if(req.user && req.user.role === role)
            next();
        else
            res.sendStatus(403);
    }
}

app.get('/lyrics/:videoID', function (req, res) {

  database.collection('lyrics')
    .find({ videoID: req.params.videoID } )
    .nextObject(function(err, obj) {

      var lyrics = (obj&&obj.lyrics) ? obj.lyrics : [];


      lyrics.sort(function(a, b){
        return a.endTime-b.endTime;
      });

      var html = compiledFunction({
        lyrics: lyrics
      });

      res.send({html: html, lyrics: lyrics});
    })
  });

app.get('/music/id/:videoID', function (req, res) {

  var vidID = req.params.videoID;
  database.collection('lyrics')
    .findOne({ videoID: vidID}, function(err, song){

      var youtube_thumbnail = "https://img.youtube.com/vi/"+song.videoID+"/hqdefault.jpg";
      var artwork_src = song.img ? song.img : youtube_thumbnail;

        res.render('player', {
          title: song.title + " | " + res.locals.title,
          artwork_src: artwork_src,
          videoID: song.videoID,
          user: req.user || null,
          canEdit: req.user && req.user.isAdmin,
          origin: req.headers.host
        });
    });
});

app.get('/', function (req, res) {

  res.render('home', {
    title: "hello",
    user: req.user || null,
  });

});


app.get('/carousel', function (req, res) {

  database.collection('lyrics').find({},{videoID: 1, title: 1}).toArray(function(err, videos) {
    res.render("carousel",{videos: videos, carouselIDquery: "#main-carousel"});
  });
});

app.get('/songs/all', function (req, res) {

  database.collection('lyrics').find({},{videoID: 1}).toArray(function(err, results) {
    var videos = [];
    results.forEach(function(obj){
      if(obj.videoID){
        videos.push(obj.videoID);
      }
    })
    res.send(videos);
  });
});

app.get( '/music/new', ensureLoggedIn(), requireRole("admin"), function (req, res) {
  res.render("new_music",{title: "New Music | " + res.locals.title});

  });

  app.post( '/music/new', ensureLoggedIn(), requireRole("admin"), function (req, res) {
        req.body["creator"] = req.user._id;
        //req.body["created"] = new Date(); // not necessary since included in id

        database.collection("lyrics").insertOne(req.body, function(){
          res.redirect("/music/id/"+req.body.videoID); //todo: make bettter;
        });

    });

    app.get('/login',
      function(req, res) {
        //res.redirect("/login/facebook");
        req.session.returnTo = req.session.returnTo || req.header('Referer');
        res.send('<a href="/login/facebook">Login with Facebook</a><br/><a href="/login/twitter">Login with Twitter</a>');
      });

  app.get('/login/facebook',
    function (req, res, next) {
      req.session.returnTo = req.session.returnTo || req.header('Referer');
      next()
    },
    passport.authenticate('facebook'));

  app.get('/login/facebook/return',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect(req.session.returnTo || "/");
    });

  app.get('/logout', function(req, res){
    req.logout();
    res.redirect(req.header('Referer') || '/');
  });

app.post('/lyrics/:videoID/addline', function (req, res) {

  var obj = req.body;
  obj.lastEditBy = req.user._id;
  obj.revised=false;

  database.collection('lyrics').update(
     { videoID: req.params.videoID } ,
     {
       $push: { lyrics: obj }
     },
     function(err, result) {

       res.send(obj); //todo: send updated lyric display?
     }
  );

});

function updateLyric(req, res, obj) {

  database.collection('lyrics').update(
     { videoID: req.params.videoID, "lyrics.id": req.params.lineID } ,
     { $set: obj,
       $currentDate: {"lyrics.$.lastEdit": true}
      },
     function(err, result) {

       res.send(req.user._id); //todo: send updated lyric display?
     }
  );

}

/*temporary script */
/*app.get('/temp',ensureLoggedIn(), function (req, res) {

  database.collection('lyrics').find().forEach(function (song){
    if(song.lyrics){


      song.lyrics.forEach(function(lyric){
        //lyric.lastEditBy = req.user._id;
        lyric.revised = false;
      });


      database.collection('lyrics').save(song);

    }
  });

  res.send("done");

});
*/


app.post('/lyrics/:videoID/editline/:lineID', ensureLoggedIn(), function (req, res) {


var obj = {};
for(k in req.body.update){
  obj["lyrics.$."+k]=req.body.update[k];
}
obj["lyrics.$.lastEditBy"]=req.user._id;

  console.log("req.body.original.revised",req.body.original.revised);

  if((JSON.parse(req.body.original.revised))  || (req.user._id!=req.body.original.lastEditBy)){
    console.log("this lyric is in revision phase");

    //different user, so must start saving revisions
    obj["lyrics.$.revised"]=true; //todo: could be redundant

    var revision = req.body.original;
    revision.songID = req.params.videoID;
    revision.user = revision.lastEditBy;
    delete revision.lastEditBy;


    database.collection("revisions").insertOne(revision, function(err, results){
      updateLyric(req, res, obj);
    });

  }else{ //todo: use promise
    console.log("this lyric is not yet being revised. direct update")
    updateLyric(req, res, obj);
  }

});

MongoClient.connect(process.env.DB_URL, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  database = db;

  var port = (process.env.PORT || 3000);
  app.listen(port, function () {
    console.log('Example app listening on port ' + port + "!");
  })

});
