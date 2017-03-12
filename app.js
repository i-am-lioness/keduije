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
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

var fbCallbackURL = process.env.DEV ?
  'http://localhost:3000/login/facebook/return'
  : 'http://keduije1.herokuapp.com/login/facebook/return';
var database;

function getFacebookUser(facebookProfile, cb){
  database.collection('users').findAndModify(
     { facebookID: facebookProfile.id } ,
     { facebookID: -1 },
     { $set: { facebookID: facebookProfile.id,
                lastLogin: new Date(),
                facebookName: facebookProfile.displayName,
                role: "member"
      } },
     { upsert: true },
     function(err, result) {
       cb(err,result.value);
     }
  );
}

function getUser(facebookProfileId, cb){
  database.collection('users').findOne(
    { facebookID: facebookProfileId },
    function (err, result){
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
  cb(null, user.facebookID);
});

passport.deserializeUser(function(obj, cb) {
  getUser(obj, cb);
});

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//app.use(cors());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

//app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));


app.use(passport.initialize());
app.use(passport.session());



function requireRole(role) {
    return function(req, res, next) {
        if(req.user && req.user.role === role)
            next();
        else
            res.send(403);
    }
}

app.get('/lyrics/:videoID', function (req, res) {

  database.collection('lyrics')
    .find({ videoID: req.params.videoID } )
    .nextObject(function(err, obj) {

    var result = (obj) ? obj.lyrics : [];
    res.send(result);
  })
});

app.get('/music/:videoID', function (req, res) {

  var vidID = req.params.videoID;
  database.collection('lyrics')
    .findOne({ videoID: vidID}, function(err, song){

      var youtube_thumbnail = "https://img.youtube.com/vi/"+song.videoID+"/hqdefault.jpg";
      var artwork_src = song.img ? song.img : youtube_thumbnail;

      console.log("img", artwork_src);

        res.render('player', {
          title: "hello",
          artwork_src: artwork_src,
          videoID: song.videoID,
          user: req.user || null,
          canEdit: req.user && req.user.isAdmin,
          origin: req.headers.host
        });
    });
});



app.get( '/music/new', ensureLoggedIn(), requireRole("admin"), function (req, res) {

      res.send('<form method="post"><input name="videoID"><input type="submit"></form>');

  });

  app.post( '/music/new', ensureLoggedIn(), requireRole("admin"), function (req, res) {

        console.log(req.body);
        database.collection("lyrics").insertOne({videoID: req.body.videoID}, function(){
          res.redirect("/music/"+req.body.videoID); //todo: make bettter;
        });

    });

  app.get('/login/facebook',
    function (req, res, next) {
      req.session.returnTo = req.header('Referer');
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


app.post('/', function (req, res) {

  var obj = req.body;

  database.collection('lyrics').update(
     { videoID: obj.videoID } ,
     { $set: { lyrics: obj.lyrics } },
     { upsert: true },
     function(err, result) {
       assert.equal(err, null);
       res.send(result);
     }
  );

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



/*for my server-less apps */
var corsOptions = {
  origin: ['http://cycles.socialyte.us', 'http://localhost:8080'],
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.post('/cycles_log', cors(corsOptions), function (req, res, next) {
  database.collection('cycles_log').insertOne(req.body, function(err, result) {
    res.json(result);
  });

})
