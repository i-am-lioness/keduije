/* eslint-env node */
/* eslint no-console: 0 */
import { mediaTypes } from '../react/keduije-media';

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
const revision = require('./revision.js');
const mail = require('./mail.js');
const users = require('./users.js')(passport);
const cookieParser = require('cookie-parser')();


function setTitle(req, res, next) {
  res.locals.user = req.user;
  res.locals.title = 'Kezie';

  next();

  users.log(req, (text) => {
    mail.send(text);
  });
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

function startServer(db) {
  console.log('Connected successfully to db server');

  users.setDB(db); // todo: consider more elegant way to set this

/* Application settings */
  const app = express();
  app.set('view engine', 'pug');
  app.enable('trust proxy');

/* Middleware */
  app.use(bodyParser.urlencoded({
    extended: true,
  }));
  app.use(bodyParser.json());
  app.use(express.static('public'));
  app.use(express.static('out'));
  app.use(cookieParser);
  app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({ url: process.env.DB_URL }),
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(setTitle);

  /* utility functions */
  function sendLines(mediaID, res, next) {
  // todo: keep data types consistent. delete should be stored as boolean or string consistently
    db.collection('lines')
      .find({ mediaID: mediaID, deleted: { $in: ['false', false] } })
      .toArray()
      .then((lines) => {
        res.send(lines);
      })
      .catch(next);
  }

  // Todo: complete
  function validate(line) {
    line.startTime = parseInt(line.startTime, 10);
    line.endTime = parseInt(line.endTime, 10);
    return false;
  }

  /* routing */
  const setPostLoginRedirect = (req, res, next) => {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    next();
  };

  app.get('/login/twitter', setPostLoginRedirect, passport.authenticate('twitter'));

  app.get('/login/twitter/return',
    passport.authenticate('twitter', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect(req.session.returnTo || '/');
    }
  );

  app.post('/login/test',
    (req, res, next) => {
      console.log('accessed /login/test/ Time:', Date.now());
      next();
    },
    passport.authenticate(
      'local',
      { successRedirect: '/', failureRedirect: '/login' }
    )
  );

  app.get('/api/search', (req, res, next) => {
    const q = req.query.query;
    if (!q) {
      res.send(null);
      return;
    }

    db.collection('media')
    .find(
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
      )
    .toArray().then((media) => {
      res.send(media);
    })
    .catch(next);
  });

  app.get('/api/media/list', ensureLoggedIn(), (req, res, next) => {
    db.collection('media')
      .find({ status: 'published', creator: req.user._id })
      .toArray()
      .then((media) => {
        res.send(media);
      })
      .catch(next);
  });

  app.get('/api/media/:mediaID', (req, res, next) => {
    db.collection('media')
    .findOne({ _id: ObjectId(req.params.mediaID) })
    .then((media) => {
      res.send(media);
    })
    .catch(next);
  });

  app.get('/api/media', (req, res, next) => {
    db.collection('media')
    .findOne({ changeset: req.query.changeset })
    .then((media) => {
      res.send(media);
    })
    .catch(next);
  });

  app.get('/api/lines/:mediaID', (req, res, next) => {
    sendLines(req.params.mediaID, res, next);
  });

  app.get('/music/:slug',
    (req, res) => {
      const slug = req.params.slug;

      db.collection('media')
      .findOneAndUpdate({ slug: slug }, { $inc: { views: 1 } })
      .then((result) => {
        const media = result.value;

        if (!media) {
          res.status(404).send('not found'); // improve
          return;
        }

        let src = media.src;
        if (parseInt(media.type, 10) === mediaTypes.VIDEO) {
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

        // const mediaPlayer = React.createElement(MediaPlayer, props);
        // const mediaPlayerHTML = ReactDOMServer.renderToString(mediaPlayer);

        const data = {
          title: `${media.title} | ${res.locals.title}`,
          // react: `<div>${mediaPlayerHTML}</div>`,
          user: req.user || null,
          props: props,
        };

        res.render('player', data);
      });
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
      referrer: req.headers.referrer, //  Likewise for referrer
      ip: req.ip,
      host: req.hostname,
      screen: { // Get screen info that we passed in url post data
        width: req.body.width,
        height: req.body.height,
      },
      msg: req.body.msg,
    };

    console.error(error);

    mail.send(JSON.stringify(error), 'client error'); // todo: send with separate script
  });

  app.get('/api/carousel', (req, res, next) => {
    db.collection('media').find({ img: { $regex: 'ytimg' }, status: 'published' }).toArray().then((videos) => {
      if (videos.length > 0) {
        res.render('sub/carousel', { videos: videos.slice(0, 3), carouselIDquery: '#main-carousel' });
      } else {
        res.send(null); // to do: better handler
      }
    })
    .catch(next);
  });

  app.get('/api/rankings', (req, res, next) => {
    db.collection('media').find({ status: 'published' }).sort({ totalViews: -1 }).toArray()
    .then((videos) => {
      res.render('sub/media_list', { videos: videos.slice(0, 10) });
    })
    .catch(next);
  });

  app.get('/api/list/audio', (req, res, next) => {
    db.collection('media').find({ img: { $not: new RegExp('ytimg') }, status: 'published' })
    .toArray()
    .then((videos) => {
      res.render('sub/horizontal-slider', { videos: videos });
    })
    .catch(next);
  });

  app.get('/new_music', ensureLoggedIn(), requireRole('admin'), (req, res, next) => {
    db.collection('changesets').insertOne({ user: req.user._id, type: 'new' }).then((result) => {
      res.render('new_music', { title: `New Music | ${res.locals.title}`, changesetID: result.insertedId });
    })
    .catch(next);
  });

  app.post('/api/media/new', ensureLoggedIn(), requireRole('admin'), (req, res, next) => {
    req.body.creator = req.user._id;
    req.body.status = 'published';
    req.body.slug = slugify(req.body.title);
    req.body.version = 1;
    db.collection('media').insertOne(req.body).then((result) => {
      res.send(req.body.slug);
    })
    .catch(next);
  });

  app.get('/history', ensureLoggedIn(), (req, res) => {
    res.render('profile', { title: `My History | ${res.locals.title}` });
  });

// to do: parameterize. use view that matches path as default
  app.get('/test', ensureLoggedIn(), (req, res) => {
    res.render('test-runner', { });
  });

  app.get('/music/:slug/history', ensureLoggedIn(), (req, res, next) => {
    const slug = req.params.slug;

    db.collection('media').findOne({ slug: slug }).then((media) => {
      if (!media) {
        res.status(404).send('not found'); // improve
        return;
      }

      const data = {
        title: `History | ${media.title} | ${res.locals.title}`,
        props: {
          mediaID: media._id,
        },
      };

      res.render('media_history', data);
    })
    .catch(next);
  });

  app.get('/api/revisions', ensureLoggedIn(), (req, res, next) => {
    db.collection('revisions').find({ changeset: req.query.changeset, state: 'done' })
    .toArray()
    .then((revisions) => {
      res.send(revisions);
    })
    .catch(next);
  });

  app.get('/login',
    (req, res) => {
      req.session.returnTo = req.session.returnTo || req.header('Referer');
      res.send('<a href="/login/facebook">Login with Facebook</a><br/><a href="/login/twitter">Login with Twitter</a>');
    }
  );

  app.get('/login/facebook', (req, res, next) => {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    next();
  },
    passport.authenticate('facebook')
  );

  app.get('/login/facebook/return',
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

  app.get('/api/changesets/list', ensureLoggedIn(), (req, res, next) => {
    const queryDoc = {};
    if ('user' in req.query) {
      queryDoc.user = req.query.user || req.user._id;
    }
    if ('media' in req.query) {
      queryDoc.mediaID = req.query.media;
    }
    if ('from' in req.query) {
      queryDoc._id = { $lt: ObjectId(req.query.from) };
    }

    db.collection('changesets').find(queryDoc).sort({ _id: -1 }).limit(10)
      .toArray()
      .then((changesets) => {
        res.send(changesets);
      })
      .catch(next);
  });

  // to do: change to post
  app.get('/api/start_edit/:mediaID', ensureLoggedIn(), (req, res, next) => {
    db.collection('changesets')
      .insertOne({ user: req.user._id, mediaID: req.params.mediaID })
      .then((result) => {
        res.send(result.insertedId);
      })
      .catch(next);
  });

  app.get('/api/myLines', ensureLoggedIn(), (req, res, next) => {
    db.collection('lines').find({ changeset: req.query.changeset })
    .toArray()
    .then((lines) => {
      res.send(lines);
    })
    .catch(next);
  });

  app.post('/api/lines/edit/:forID', ensureLoggedIn(), (req, res, next) => {
    revision(db).onUpdateRequest('lines', req).then((line) => {
      sendLines(line.mediaID, res, next);
    });
  });

  app.post('/api/media/:mediaID/addline', (req, res, next) => {
    if (validate(req.body)) {
      res.send('error validating');
    }

    req.body.creator = req.user._id;
    req.body.mediaID = req.params.mediaID;
    req.body.version = 1;

    db.collection('lines').insertOne(req.body).then(() => {
      sendLines(req.params.mediaID, res, next);
    });
  });

  app.post('/api/media/edit/:forID', (req, res) => {
    revision(db).onUpdateRequest('media', req).then((media) => {
      res.send(media);
    });
  });

    /* temporary */
  app.use((err, req, res, next) => {
    // move error logging here, but should probably be in a try block
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });



  const port = (process.env.PORT || 3000);
  let server;

  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      console.log(`Kezie server listening on port ${port}!`);
      resolve({
        server: server,
        env: process.env,
        app: app,
      });
    }).on('error', reject); // todo: better handle
  });
}

function onDbConnectFail(err) {
  console.log(`Failed to connect to DB at URL:${process.env.DB_URL}`);
  console.log(err);
  process.exit(1); // to do: retry
}

function run() {
  return MongoClient.connect(process.env.DB_URL).then(startServer, onDbConnectFail);
}

export default run;
