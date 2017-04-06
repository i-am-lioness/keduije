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

    db.collection('media').find(
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
      { artist: 1, title: 1, slug: 1}
    ).toArray(function(err, media) {
      res.send(media);
    });

  }
);

app.get('/api/media/list', function (req, res) {

  db.collection('media').find({status: "published", creator: req.user._id}).toArray(function(err, media) {
    res.send(media);
  });
});

app.get('/api/media/:mediaID', function(req,res){
  db.collection('media')
    .findOne({_id: ObjectId(req.params.mediaID)})
    .then((media)=>{
      res.send(media);
    })
    .catch(logError);
});

app.get('/api/lines/:mediaID',sendLines);

app.get(
  '/music/:slug',
  function (req, res) {
    var slug = req.params.slug;

    db.collection('media')
      .findAndModify(
        { slug: slug},
        null,
        {$inc: {views: 1}},
        function(err, result){
          var media = result.value;

          if(!media){
            res.send("not found"); //improve
            return;
          }

          var data = {
            title: media.title + " | " + res.locals.title,
            videoID: media.videoID,
            user: req.user || null,
            canEdit: !!(req.user && req.user.isAdmin),
            src: media.src,
            mediaID: media._id,
            mediaType: media.type
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

  db.collection('media').find({ img : { $exists: false }, status: "published"},{videoID: 1, title: 1, img: 1, slug: 1}).toArray(function(err, videos) {
    res.render("sub/carousel",{videos: videos.slice(0,3), carouselIDquery: "#main-carousel"});
  });
});

app.get('/api/rankings', function (req, res) {

  db.collection('media').find({status: "published"}).sort({totalViews: -1}).toArray(function(err, videos) {
    res.render("sub/media_list",{videos: videos.slice(0,10)});
  });
});

app.get('/api/list/audio', function (req, res) {

  db.collection('media').find({ img : { $exists: true }, status: "published" }).toArray(function(err, videos) {
    res.render("sub/horizontal-slider",{videos: videos});
  });
});

app.get( '/new_music', ensureLoggedIn(), requireRole("admin"), function (req, res) {
  db.collection("media").insertOne({creator: req.user._id, status: "draft"}).then(function(result){
    res.render("new_music",{title: "New Music | " + res.locals.title, mediaID: result.insertedId});
   }).catch(logError);
});

app.get( '/history', ensureLoggedIn(), function (req, res) {
  res.render("profile",{title: "My History | " + res.locals.title});
});

app.get( '/api/revisions', ensureLoggedIn(), function (req, res) {
  db.collection("revisions").find({changeset: req.query.changeset, state: "done"}).toArray(function(err, revisions){
    //console.log({user: req.user._id, state: "done"});
    res.send(revisions);
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
function validate(line){
  line.startTime = parseInt(line.startTime);
  line.endTime = parseInt(line.endTime);
  return false;
}

/*temporary script */
/*
app.get('/temp', function (req, res) {

  if(req.ip != process.env.DEVELOPER_IP){
    res.send("Forbidden IP");
    return;
  }

  db.collection('media').find().forEach(function (media){
    console.log(media.title);

    db.collection('media').save(media);
  });

  res.send("done");

});
*/

app.get( '/api/changesets/list', ensureLoggedIn(), function (req, res) {
  db.collection("changesets").find({user: req.user._id}).toArray(function(err, changesets) {
    res.send(changesets);
  });
});

app.get( '/api/start_edit/:mediaID', ensureLoggedIn(), function (req, res) {
  db.collection("changesets").insertOne({user: req.user._id, mediaID: req.params.mediaID}).then(function(result){
    res.send(result.insertedId);
   }).catch(logError);
});

function logError(error, res){
  console.log("Error", error);
  if(res){
    res.status(500).send(error);
  }
}

function sendLines(req, res){
  var mediaID = req.params? req.params.mediaID : req;

  db.collection("lines").find({mediaID: mediaID}).toArray(function(err, lines) {
    res.send(lines);
  });
}

app.get( '/api/myLines', ensureLoggedIn(), function (req, res) {
  db.collection("lines").find({changeset: req.query.changeset}).toArray(function(err, lines) {
    //console.log(lines);
    res.send(lines);
  });
});

function commitRevision(revision){
	revision.state="applied";
	db.collection("revisions").save(revision).then(function(){
		db.collection(revision.target).updateOne(
			{ _id: revision.forID, pendingRevisions: revision._id},
			{$pull: {pendingRevisions: revision._id}}
		).then(function(result){
			revision.state="done";
			db.collection("revisions").save(revision);
		});
	}).catch(logError);
}

function getVersionNumber(revision) {
	return new Promise((resolve, reject) => {

    if(revision.original){
		 db.collection(revision.target).findAndModify(
			 { _id: revision.forID },
			 null,
			 { $inc: { version: 1 } },
			 {new: true}
		 ).then((result)=>{ 
        var versionNumber = result.value.version;
        if((versionNumber-1)==parseInt(revision.original.version)){
          //this revision is the next version, and will be applied
          resolve(versionNumber);
        }else{
          reject("Version "+ versionNumber + " already edited.");

          revision.state="canceled";
          db.collection("revisions").save(revision);
        }
      }).catch(reject);
    }else{
      //not needed for new media
      resolve(1);
    }
	});
}

function applyChange(revision, res, queryObj, updateObj, versionNumber){
  updateObj.$set.version=versionNumber;
	db.collection(revision.target).findAndModify(
		queryObj,
		null,
		updateObj,
		{new: true}
	).then(
		function(result){
			//console.log(result);

      if(res){
        if(revision.target=="media"){
          res.send(result.value); //todo: error checking
        } else if(revision.target=="lines"){
          sendLines(result.value.mediaID, res);
        }else {
          res.send("error, unrecognized db collection name: "+ revision.target);
        }
      }

			commitRevision(revision)
		}
	).catch(logError);
}

function processRevision(revision, res){

	var queryObj = { _id: revision.forID, pendingRevisions: { $ne: revision._id } };
	var updateObj = {
		$push: {pendingRevisions: revision._id},
		$currentDate: { lastModified: true },
    $set: revision.newValues
	};

  if((revision.target=="media") && revision.newValues.title)
    revision.newValues.slug=slugify(revision.newValues.title);

  getVersionNumber(revision)
    .then(applyChange.bind(this, revision, res, queryObj, updateObj))
    .catch((error)=>{ logError(error,res)});

}

function executeEdit(target, req, res){
	var revision = {
		state: "pending",
		target: target,
		user: req.user._id,
    forID: ObjectId(req.params.forID),
		lastModified: new Date(),
		newValues: req.body.changes,
    original: req.body.original,
    changeset: req.body.changeset,
    mediaID: req.body.mediaID //for easy querying of all song edits
	};

	db.collection("revisions").insertOne(revision).then(processRevision.bind(this, revision, res)).catch(logError);
}

app.post('/api/lines/edit/:forID', ensureLoggedIn(), executeEdit.bind(this, "lines"));

app.post('/api/media/:mediaID/addline', function (req, res) {

  if(validate(req.body)){
    res.send("error validating");
  }

  req.body.creator = req.user._id;
  req.body.mediaID = req.params.mediaID;
  req.body.version = 1;

  db.collection("lines").insertOne(req.body).then(sendLines.bind(this, req.params.mediaID, res)).catch(logError);

});


app.post("/api/media/edit/:forID", executeEdit.bind(this, "media"));


MongoClient.connect(process.env.DB_URL, function(err, _db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  db = _db;

  var port = (process.env.PORT || 3000);
  app.listen(port, function () {
    console.log('Example app listening on port ' + port + "!");
  })

});
