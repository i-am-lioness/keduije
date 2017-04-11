/* eslint-env node */
import MediaPlayer from './react/components/media-player.jsx';
import KeduIjeMedia from './react/keduije-media';

require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const ObjectId = require('mongodb').ObjectId;
const slugify = require('slugify');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const revision = require('./lib/revision.js');
const mail = require('./lib/mail.js');
const users = require('./lib/users.js')(passport);
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const app = express();

let db;

app.set('view engine', 'pug');
app.enable('trust proxy');
app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('out'));
app.use(require('cookie-parser')());

app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
  store: new MongoStore({ url: process.env.DB_URL }),
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.title = 'Kezie';
  // res.locals.authenticated = ! req.user.anonymous;

  next();

  users.log(req, (text) => {
    mail.send(text);
  });
});

function logError(error) {
  console.log('Error: ', error);
}

function sendLines(mediaID, res) {
  // todo: keep data types consistent. delete should be stored as boolean or string consistently
  db.collection('lines').find({ mediaID: mediaID, deleted: { $in: ['false', false] } }).toArray((err, lines) => {
    res.send(lines);
  });
}

app.get(
  '/login/twitter',
  (req, res, next) => {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    next();
  },
  passport.authenticate('twitter')
);

app.get(
  '/login/twitter/return',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(req.session.returnTo || '/');
  }
);

app.get(
  '/login/yc',
  (req, res) => {
    const html = '<body onload="document.login.submit()"> \
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
    { successRedirect: '/music/E-sure-for-me-(Olisa-Doo)', failureRedirect: '/login' }
  )
);

app.get(
  '/api/search',
  (req, res) => {
    const q = req.query.query;
    if (!q) {
      res.send(null);
      return;
    }

    db.collection('media').find(
      { $or: [
        {
          artist: {
            $regex: q,
            $options: 'i',
          },
        },
        {
          title: {
            $regex: q,
            $options: 'i',
          },
        }
      ] },
      { artist: 1, title: 1, slug: 1 }
    ).toArray((err, media) => {
      res.send(media);
    });
  }
);

app.get('/api/media/list', (req, res) => {
  db.collection('media').find({ status: 'published', creator: req.user._id }).toArray((err, media) => {
    res.send(media);
  });
});

app.get('/api/media/:mediaID', (req, res) => {
  db.collection('media')
    .findOne({ _id: ObjectId(req.params.mediaID) })
    .then((media) => {
      res.send(media);
    })
    .catch(logError);
});

app.get('/api/media', (req, res) => {
  db.collection('media')
    .findOne({ changeset: req.query.changeset })
    .then((media) => {
      res.send(media);
    })
    .catch(logError);
});

app.get('/api/lines/:mediaID', (req, res) => {
  sendLines(req.params.mediaID, res);
});

app.get(
  '/music/:slug',
  (req, res) => {
    const slug = req.params.slug;

    db.collection('media')
      .findAndModify(
        { slug: slug },
        null,
        { $inc: { views: 1 } },
        (err, result) => {
          const media = result.value;

          if (!media) {
            res.send('not found'); // improve
            return;
          }

          let src = media.src;
          if (parseInt(media.type, 10) === KeduIjeMedia.mediaTypes.VIDEO) {
            src = `http://www.youtube.com/embed/${media.videoID
              }?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=${req.protocol}://${
                req.get('host')}&playsinline=1&rel=0&controls=0`;
          }

          const props = {
            canEdit: (!!(req.user && req.user.isAdmin)),
            src: src,
            mediaType: parseInt(media.type, 10),
            mediaID: media._id.toString(),
            img: media.img,
            title: media.title,
            artist: media.artist,
            slug: media.slug,
          };

          const mediaPlayer = React.createElement(MediaPlayer, props);
          const mediaPlayerHTML = ReactDOMServer.renderToString(mediaPlayer);

          const data = {
            title: `${media.title} | ${res.locals.title}`,
            react: `<div>${mediaPlayerHTML}</div>`,
            user: req.user || null,
            props: props,
          };

          res.render('player', data);
        }
      );
  }
);

app.get('/', (req, res) => {
  res.render('home', {
    title: 'Nno! Kezie.com',
    user: req.user || null,
  });
});

app.post('/api/logError', (req, res) => {
  const error = {
    agent: req.headers['user-agent'], // User Agent we get from headers
    referrer: req.headers['referrer'], //  Likewise for referrer
    ip: req.ip,
    host: req.hostname,
    screen: { // Get screen info that we passed in url post data
      width: req.body.width,
      height: req.body.height,
    },
    msg: req.body.msg,
  };

  console.log(error);
  db.collection('errors').insertOne(error); // todo: log instead

  mail.send(JSON.stringify(error), 'client error'); // todo: send with separate script
});

app.get('/api/carousel', (req, res) => {
  db.collection('media').find({ img: { $exists: false }, status: 'published' }, { videoID: 1, title: 1, img: 1, slug: 1 }).toArray((err, videos) => {
    res.render('sub/carousel', { videos: videos.slice(0, 3), carouselIDquery: '#main-carousel' });
  });
});

app.get('/api/rankings', (req, res) => {
  db.collection('media').find({ status: 'published' }).sort({ totalViews: -1 }).toArray((err, videos) => {
    res.render('sub/media_list', { videos: videos.slice(0, 10) });
  });
});

app.get('/api/list/audio', (req, res) => {
  db.collection('media').find({ img: { $exists: true }, status: 'published' }).toArray((err, videos) => {
    res.render('sub/horizontal-slider', { videos: videos });
  });
});

app.get('/new_music', ensureLoggedIn(), users.require('admin'), (req, res) => {
  db.collection('changesets').insertOne({ user: req.user._id, type: 'new' }).then((result) => {
    res.render('new_music', { title: 'New Music | ' + res.locals.title, changesetID: result.insertedId });
  }).catch(logError);
});

app.post('/api/media/new', ensureLoggedIn(), users.require('admin'), (req, res) => {
  req.body.creator = req.user._id;
  req.body.status = 'published';
  req.body.slug = slugify(req.body.title);
  req.body.version = 1;
  db.collection('media').insertOne(req.body).then((result) => {
    res.send(req.body.slug);
  }).catch(logError);
});

app.get('/history', ensureLoggedIn(), (req, res) => {
  res.render('profile', { title: 'My History | ' + res.locals.title });
});

app.get('/music/:slug/history', ensureLoggedIn(), (req, res) => {
  const slug = req.params.slug;

  db.collection('media').findOne({ slug: slug }).then((media) => {
    if (!media) {
      res.send('not found'); // improve
      return;
    }

    const data = {
      title: 'History | ' + media.title + ' | ' + res.locals.title,
      props: {
        mediaID: media._id,
      },
    };

    res.render('media_history', data);
  });
});

app.get('/api/revisions', ensureLoggedIn(), (req, res) => {
  db.collection('revisions').find({ changeset: req.query.changeset, state: 'done' }).toArray((err, revisions) => {
    res.send(revisions);
  });
});

app.get(
  '/login',
  (req, res) => {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    res.send('<a href="/login/facebook">Login with Facebook</a><br/><a href="/login/twitter">Login with Twitter</a>');
  }
);

app.get(
  '/login/facebook',
  (req, res, next) => {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    next();
  },
  passport.authenticate('facebook')
);

app.get(
  '/login/facebook/return',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    const returnTo = req.session.returnTo || '/';
    req.session.returnTo = null;
    res.redirect(returnTo);
  }
);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect(req.header('Referer') || '/');
});

// Todo: complete
function validate(line) {
  line.startTime = parseInt(line.startTime, 10);
  line.endTime = parseInt(line.endTime, 10);
  return false;
}

app.get('/api/changesets/list', ensureLoggedIn(), (req, res) => {
  const queryDoc = {};
  if ('user' in req.query) {
    queryDoc.user = req.query.user || req.user._id;
  } if ('media' in req.query) {
    queryDoc.mediaID = req.query.media;
  } if ('from' in req.query) {
    queryDoc._id = { $lt: ObjectId(req.query.from) };
  }

  db.collection('changesets').find(queryDoc).sort({ _id: -1 }).limit(10)
  .toArray((err, changesets) => {
    res.send(changesets);
  });
});

app.get('/api/start_edit/:mediaID', ensureLoggedIn(), (req, res) => {
  db.collection('changesets').insertOne({ user: req.user._id, mediaID: req.params.mediaID }).then((result) => {
    res.send(result.insertedId);
  }).catch(logError);
});

function sendError(res, error) {
  logError(error);
  res.status(500).send(error);
}

app.get('/api/myLines', ensureLoggedIn(), (req, res) => {
  db.collection('lines').find({ changeset: req.query.changeset })
  .toArray((err, lines) => {
    res.send(lines);
  });
});

app.post('/api/lines/edit/:forID', ensureLoggedIn(), (req, res) => {
  revision(db).onUpdateRequest('lines', req).then((line) => {
    sendLines(line.mediaID, res);
  }).catch(sendError.bind(this, res));
});

app.post('/api/media/:mediaID/addline', (req, res) => {
  if (validate(req.body)) {
    res.send('error validating');
  }

  req.body.creator = req.user._id;
  req.body.mediaID = req.params.mediaID;
  req.body.version = 1;

  db.collection('lines').insertOne(req.body).then(() => {
    sendLines(req.params.mediaID, res);
  }).catch(logError);
});

app.post('/api/media/edit/:forID', (req, res) => {
  revision(db).onUpdateRequest('media', req).then((media) => {
    res.send(media);
  }).catch(sendError.bind(this, res));
});

MongoClient.connect(process.env.DB_URL, (err, _db) => {
  console.log('Connected successfully to server');
  db = _db;

  users.setDB(db);

  const port = (process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
  });
});
