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
var nodemailer = require('nodemailer');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

var db;


var twCallbackURL = process.env.HOST + "/login/twitter/return";
var fbCallbackURL = process.env.HOST + "/login/facebook/return";

var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_ADDRESS,
            pass: process.env.EMAIL_PASSWORD,
        }
    });

var mailOptions = {
    from: process.env.EMAIL_ADDRESS, // sender address
    to: process.env.EMAIL_ADDRESS, // list of receivers
    subject: 'Web activity', // Subject line
    text: "someone accessed" //, // plaintext body
    // html: '<b>Hello world ✔</b>' // You can choose to send an HTML body instead
};


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
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
  store: new MongoStore({ url: process.env.DB_URL })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next){
  res.locals.user = req.user;
  res.locals.title = "Kezie"
  //res.locals.authenticated = ! req.user.anonymous;

  next();

  logUser(req);
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

  mailOptions.text = JSON.stringify(record);

  transporter.sendMail(mailOptions, function(error, info){
    if(error){
        console.log(error);
        res.json({yo: 'error'});
    }else{
        console.log('Message sent: ' + info.response);
        res.json({yo: info.response});
    };
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
  '/api/search',
  function (req, res) {

    var q = req.query.query;
    if (!q) {
      res.send(null);
      return;
    }

    db.collection('lyrics').find(
      {$or : [
        {
            artist: {
                $regex: q,
                $options: "i"
            }
        },
        {
            title: {
                $regex: q,
                $options: "i"
            }
        }
    ]},
      { artist: 1, title: 1, songID: 1, slug: 1}
    ).toArray(function(err, songs) {
      res.send(songs)
    });

  }
);

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

app.post("/api/logError", function (req, res){

  var error = {
    agent: req.headers['user-agent'], // User Agent we get from headers
    referrer: req.headers['referrer'], //  Likewise for referrer
    ip: req.ip,
    host: req.hostname,
    screen: { // Get screen info that we passed in url post data
      width: req.body.width,
      height: req.body.height
    },
    msg: req.body.msg
  };

  console.log(error);
  db.collection("errors").insertOne(error); //todo: log instead

  mailOptions.text = JSON.stringify(error);
  mailOptions.subject = "client error";

  transporter.sendMail(mailOptions, function(error, info){
    if(error){
        console.log(error);
        res.json({yo: 'error'});
    }else{
        console.log('Message sent: ' + info.response);
        res.json({yo: info.response});
    };
  });

});

app.get('/api/carousel', function (req, res) {

  db.collection('lyrics').find({ img : { $exists: false }},{videoID: 1, title: 1, img: 1, slug: 1}).toArray(function(err, videos) {
    res.render("sub/carousel",{videos: videos.slice(0,3), carouselIDquery: "#main-carousel"});
  });
});

app.get('/api/rankings', function (req, res) {

  db.collection('lyrics').find().sort({totalViews: -1}).toArray(function(err, videos) {
    res.render("sub/media_list",{videos: videos.slice(0,10)});
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
  db.collection("lyrics").insertOne({creator: req.user._id, status: "draft"}).then(function(result){
    res.render("new_music",{title: "New Music | " + res.locals.title, songID: result.insertedId});
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

/*temporary script */
/*
app.get('/temp', function (req, res) {

  if(req.ip != process.env.DEVELOPER_IP){
    res.send("Forbidden IP");
    return;
  }

  db.collection('lyrics').find().forEach(function (song){
    console.log(song.title);
    if(song.lyrics){
//      song.lyrics.forEach(function(lyric){
//        lyric.revised = false;
//      });
			song.lyricCnt = song.lyrics.length;
    }
		
    db.collection('lyrics').save(song);
  });

  res.send("done");

});
*/



function commitRevision(revision){
	revision.state="applied";
	db.collection("revisions").save(revision).then(function(){
		db.collection('lyrics').updateOne(
			{ _id: revision.songID, pendingRevisions: revision._id},
			{$pull: {pendingRevisions: revision._id}}
		).then(function(result){
			revision.state="done";
			db.collection("revisions").save(revision);
		});
	});
}


function getNewLyricID(songID) {
	return new Promise((resolve, reject) => {
		 db.collection("lyrics").findAndModify(
			 { _id: songID }, 
			 null,
			 { $inc: { lyricCnt: 1 } },
			 {new: true}
		 ).then((result)=>{ resolve(result.value.lyricCnt.toString());}, reject);
	});
}

function _processRevision(revision, res, queryObj, updateObj){
	console.log("queryObj", queryObj);
	console.log("updateObj",updateObj);
	db.collection('lyrics').findAndModify(
		queryObj,
		null,
		updateObj,
		{new: true}
	).then(
		function(result){
			//console.log(result);
			var song = result.value;
			res.send(song); //todo: error checking

			commitRevision(revision)
		},
		function(err){
			console.log(err);
		}
	);
}

function processRevision(revision, res){
	
	var queryObj = { _id: revision.songID};
	var updateObj = {
		$push: {pendingRevisions: revision._id},
		$currentDate: { lastModified: true }
	};
	
	switch(revision.action){
		case "edit_lyric":
			queryObj["lyrics.id"]=revision.lineID;
			updateObj["$set"]={"lyrics.$": revision.newValue};
			return _processRevision(revision, res, queryObj, updateObj);
		case "add_lyric":
			updateObj["$push"].lyrics = revision.newValue;
			return getNewLyricID(revision.songID).then((id)=>{ //todo: implement with await
				revision.lineID=id;
				revision.newValue.id=revision.lineID; 
				_processRevision(revision, res, queryObj, updateObj);
			});
		case "edit_song":
			updateObj["$set"]=revision.newValue;
			if(revision.newValue.title) updateObj["$set"].slug=slugify(revision.newValue.title);
			return _processRevision(revision, res, queryObj, updateObj);
		default:
			res.send("unknown action: "+ revision.action)
			return;
	}
	
	
}

function executeAction(action, req, res){
	var revision = {
		state: "pending", 
		action: action,
		user: req.user._id,
		songID: ObjectId(req.params.songID),
		lineID: req.params.lineID || null,
		lastModified: new Date(),
		newValue: req.body
	};
	
	db.collection("revisions").insertOne(revision).then(function(results){
		//todo: error checking
		//later: will be handled by a worker process
		processRevision(revision, res);
	});
}

app.post('/api/lyrics/:songID/editline/:lineID', ensureLoggedIn(), function (req, res) {
	
	executeAction("edit_lyric", req, res);

});

app.post('/api/lyrics/:songID/addline', function (req, res) {

  var obj = req.body;

  if(validate(obj)){
    res.send("error validating");
  }

	executeAction("add_lyric", req, res);

});


app.post("/api/song/edit/:songID", function (req, res){

	executeAction("edit_song", req, res);

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
