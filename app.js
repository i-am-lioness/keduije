require('dotenv').config()
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');
var express = require('express');
var app = express();
const bodyParser= require('body-parser');
var cors = require('cors')
var path = require('path');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var ObjectId = require('mongodb').ObjectId;
var slugify = require('slugify')


var db;

var twCallbackURL = process.env.DEV ?
  'http://localhost:3000/login/twitter/return'
  : 'http://keduije1.herokuapp.com/login/twitter/return';

var fbCallbackURL = process.env.DEV ?
  'http://localhost:3000/login/facebook/return'
  : 'http://keduije1.herokuapp.com/login/facebook/return';

function getTwitterUser(twitterProfile, cb){
  db.collection('users').findAndModify(
    { twitterID: twitterProfile.id } ,
    { twitterID: -1 },
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
    console.log("local strategy");
    console.log("username", username);
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

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'pug')

app.enable('trust proxy');


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

  logUser(req);

  next();
});

app.get(
  '/login/twitter',
  function (req, res, next) {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    next()
  },
  passport.authenticate('twitter')
);

app.get(
  '/login/twitter/return',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect(req.session.returnTo || "/");
  }
);

function logUser(req){
  if(req.ip == process.env.DEVELOPER_IP) return; //do not log local requests
  if(req.xhr) return; //do not log ajax requests
  if(req.path.startsWith("/logout")) return;
  if(req.path.startsWith("/login")){
    if(req.path!="/login/yc") return;
  }

  var user = (req.user)? req.user.displayName : "anonymous";
  if (user=="Nnenna Ude") return;

  db.collection("logs").insertOne({
    user: user,
    path: req.path,
    from: req.ip,
    date: (new Date().toString())
  });
}

app.get(
  '/login/yc',
  function(req,res){
    var html = '<body onload="document.login.submit()"> \
    <form name="login" action="/login/yc" method="post" onload="" style="display: none"> \
    <div> \
        <label>Username:</label> \
        <input type="text" name="username" value="yc"/> \
    </div> \
    <div> \
        <label>Password:</label> \
        <input type="password" name="password" value="pw"/> \
    </div> \
    <div> \
        <input type="submit" value="Log In"/> \
    </div> \
    </form> \
    </body>';

    res.send(html);
  }
);

app.post(
  '/login/yc',
  passport.authenticate(
    'local',
    { successRedirect: '/music/E-sure-for-me-(Olisa-Doo)', failureRedirect: '/login'}
  )
);

function requireRole(role) {
  return function(req, res, next) {
    if(req.user && req.user.role === role)
      next();
    else
      res.sendStatus(403);
    }
}

app.get(
  '/api/lyrics/:songID',
  function (req, res) {
    db.collection('lyrics').find({ _id: ObjectId(req.params.songID) } )
      .nextObject(function(err, obj) {
        var lyrics = (obj&&obj.lyrics) ? obj.lyrics : [];
        //res.send(lyrics);
        res.send(obj);
      })
  }
);

app.get(
  '/music/:slug',
  function (req, res) {
    var slug = req.params.slug;

    db.collection('lyrics')
      .findAndModify(
        { slug: slug},
        null,
        {$inc: {views: 1}},
        function(err, result){
          var song = result.value;

          if(!song){
            res.send("not found"); //improve
            return;
          }

          var youtube_thumbnail = "https://img.youtube.com/vi/"+song.videoID+"/hqdefault.jpg";
          var artwork_src = song.img || youtube_thumbnail;

          //do better
          var src = song.videoID ? 'http://www.youtube.com/embed/' + song.videoID
            +'?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://'
             + req.headers.host + '&playsinline=1&rel=0&controls=0' : song.url;

          var data = {
            title: song.title + " | " + res.locals.title,
            artwork_src: artwork_src,
            videoID: song.videoID,
            user: req.user || null,
            canEdit: !!(req.user && req.user.isAdmin),
            src: src,
            songID: song._id
          };
          //console.log(data);
          res.render('player', data);
        }
      );
  }
);

app.get('/', function (req, res) {

  res.render('home', {
    title: "Nno! Kezie.com",
    user: req.user || null,
  });

});

app.post("/api/song/edit", function (req, res){
  db.collection('lyrics').findAndModify(
    {_id: ObjectId(req.body.songID)},
    null,
    {$set: {
      title: req.body.title,
      artist: req.body.artist, //todo, only update if changed
      slug: slugify(req.body.title)
    }},
    {new: true},
     function (err, result){
      res.send(result.value);
    }
  )
});
app.get('/api/carousel', function (req, res) {

  db.collection('lyrics').find({ img : { $exists: false }},{videoID: 1, title: 1, img: 1, slug: 1}).toArray(function(err, videos) {
    res.render("sub/carousel",{videos: videos.slice(0,3), carouselIDquery: "#main-carousel"});
  });
});

app.get('/api/rankings', function (req, res) {

  db.collection('lyrics').find({ img : { $exists: false }}).sort({views: -1}).toArray(function(err, videos) {
    res.render("sub/media_list",{videos: videos});
  });
});

app.get('/api/list/audio', function (req, res) {

  db.collection('lyrics').find({ img : { $exists: true }},{slug: 1, title: 1, img: 1}).toArray(function(err, videos) {
    res.render("sub/horizontal-slider",{videos: videos});
  });
});

app.get('/videos/all', function (req, res) {

  db.collection('lyrics').find({},{videoID: 1}).toArray(function(err, results) {
    var videos = [];
    results.forEach(function(obj){
      if(obj.videoID){
        videos.push(obj.videoID);
      }
    })
    res.send(videos);
  });
});

app.get( '/new_music', ensureLoggedIn(), requireRole("admin"), function (req, res) {
  res.render("new_music",{title: "New Music | " + res.locals.title});

  });

app.post( '/new_music', ensureLoggedIn(), requireRole("admin"), function (req, res) {
  req.body["creator"] = req.user._id;
  req.body["slug"] = slugify(req.body.title)
  db.collection("lyrics").insertOne(req.body, function(){
    res.redirect("/music/"+req.body.slug); //todo: make bettter;
  });
});

app.get(
  '/login',
  function(req, res) {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    res.send('<a href="/login/facebook">Login with Facebook</a><br/><a href="/login/twitter">Login with Twitter</a>');
  }
);

app.get(
  '/login/facebook',
  function (req, res, next) {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    next()
  },
  passport.authenticate('facebook')
);

app.get(
  '/login/facebook/return',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    var returnTo = req.session.returnTo || "/";
    req.session.returnTo=null;
    res.redirect(returnTo);
  }
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect(req.header('Referer') || '/');
});

//Todo: complete
function validate(lyric){
  lyric.startTime = parseInt(lyric.startTime);
  lyric.endTime = parseInt(lyric.endTime);
  return false;
}

app.post('/api/lyrics/:songID/addline', function (req, res) {

  var obj = req.body;
  obj.lastEditBy = req.user._id;
  obj.revised=false;

  if(validate(obj)){
    res.send("error validating");
  }

  db.collection('lyrics').findAndModify(
     { _id: ObjectId(req.params.songID) } ,
     null,
     {
       $push: { lyrics: obj }
     },
     {new: true},
     function(err, result) {
       res.send(result.value.lyrics); //todo: error checking
     }
  );

});

function updateLyric(req, res, obj) { //todo: obj might be redundant

  //'Cannot update \'lyrics.5\' and \'lyrics.5.lastEdit\' at the same time',
  obj.lastEdit = new Date();

  db.collection('lyrics').findAndModify(
     { _id: ObjectId(req.params.songID), "lyrics.id": req.params.lineID } ,
     null,
     { $set: { "lyrics.$" : obj }
      },
      {new: true},
     function(err, result) {
       res.send(result.value.lyrics); //todo: error checking
     }
  );

}

/*temporary script */
//todo: check the host that is requesting it
/*app.get('/temp', function (req, res) {

  db.collection('lyrics').find().forEach(function (song){
    if(song.lyrics){


//      song.lyrics.forEach(function(lyric){
//        lyric.revised = false;
//      });

    }
    song.slug = slugify(song.title);
    db.collection('lyrics').save(song);
  });

  res.send("done");

});
*/


app.post('/api/lyrics/:songID/editline/:lineID', ensureLoggedIn(), function (req, res) {

  req.body.new.lastEditBy=req.user._id;

  console.log("req.body.original.revised",req.body.original.revised);

  if((JSON.parse(req.body.original.revised))  || (req.user._id!=req.body.original.lastEditBy)){
    console.log("this lyric is in revision phase");

    //different user, so must start saving revisions
    req.body.new.revised = true; //todo: could be redundant

    var revision = req.body.original; //todo: get original record directly from db rather than from client
    revision.songID = req.params.songID;
    revision.user = revision.lastEditBy;
    delete revision.lastEditBy;


    db.collection("revisions").insertOne(revision, function(err, results){
      updateLyric(req, res, req.body.new);
    });

  }else{ //todo: use promise
    console.log("this lyric is not yet being revised. direct update")
    updateLyric(req, res, req.body.new);
  }

});

MongoClient.connect(process.env.DB_URL, function(err, _db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  db = _db;

  var port = (process.env.PORT || 3000);
  app.listen(port, function () {
    console.log('Example app listening on port ' + port + "!");
  })

});
