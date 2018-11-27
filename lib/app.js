/* eslint-env node */
/* eslint no-console: 0 */
import { mediaTypes } from '../react/keduije-media';
import Revision, { revisionTypes } from './revision';
import getSpotifyToken from './spotify';
import connectDB from './db';
import { tables } from './constants';

const express = require('express');
const bodyParser = require('body-parser');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const ObjectId = require('mongodb').ObjectId;
const slugify = require('slugify');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const mail = require('./mail.js');
const users = require('./users.js')();
const cookieParser = require('cookie-parser')();

class HTTP404Error extends Error {
  constructor(message) {
    super(message);
    this.name = 'HTTP404Error';
  }
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

function frontEndDataSender(req, res, next) {
  res.locals.user = req.user;
  res.locals.title = 'Kezie';
  next();
}

function startServer(db, env, start) {
  console.log('Connected successfully to database server');

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
    store: new MongoStore({ url: env.DB_URL }),
  }));
  app.use(users.initialize(db, env)); // TO DO: integration test when env, missing
  app.use(users.session());
  app.use(frontEndDataSender);

  const mailer = mail(env.EMAIL_ADDRESS, env.EMAIL_PASSWORD);
  function requestLogger(req, res, next) {
    next(); // don't slow down request for logging
    users.log(req)
      .then((logText) => {
        if (logText) {
          return mailer.send(logText);
        }
        return null;
      }).catch(next);
  }
  app.use(requestLogger);

  /* utility functions */
  function sendLines(forMedia, res, next) {
    // todo: keep data types consistent. delete should be stored as boolean or string consistently
    // todo: also check for ones where deleted is not defined
    db(tables.LINES)
      .find({ media: forMedia, deleted: { $in: ['false', false] } })
      .toArray()
      .then((lines) => {
        res.send(lines);
      })
      .catch(next);
  }

  /* authentication */
  const setPostLoginRedirect = (req, res, next) => {
    req.session.returnTo = req.session.returnTo || req.header('Referer');
    next();
  };

  app.get('/login/twitter', setPostLoginRedirect, users.authenticate('twitter'));

  app.get('/login/twitter/return',
    users.authenticate('twitter'),
    (req, res) => {
      res.redirect(req.session.returnTo || '/');
    }
  );

  app.get('/login',
    (req, res) => {
      req.session.returnTo = req.session.returnTo || req.header('Referer');
      res.send('<a href="/login/facebook">Login with Facebook</a><br/><a href="/login/twitter">Login with Twitter</a>');
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
  }, users.authenticate('local'), (req, res) => {
    debugger;
    res.redirect(req.session.returnTo || '/');
  });

  app.get('/login/facebook', setPostLoginRedirect, users.authenticate('facebook'));

  app.get('/login/facebook/return', users.authenticate('facebook'),
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


  /* routing */
  app.get('/api/search', (req, res, next) => {
    const q = req.query.query;
    if (!q) {
      res.send(null);
      return;
    }

    db(tables.MEDIA)
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
      ],
        status: 'published',
      },
      { artist: 1, title: 1, slug: 1 }
      )
    .toArray().then((media) => {
      res.send(media);
    })
    .catch(next);
  });

  app.get('/api/media/list', ensureLoggedIn(), (req, res, next) => {
    db(tables.MEDIA)
      .find({ status: 'published', creator: req.user._id })
      .toArray()
      .then((media) => {
        res.send(media);
      })
      .catch(next);
  });

  app.get('/music/:slug', (req, res, next) => {
    const slug = req.params.slug;

    db(tables.MEDIA).aggregate([
      { $match: { slug } },
      { $lookup: {
        from: 'lines',
        localField: '_id',
        foreignField: 'media',
        as: 'lines',
      } }
    ]).next()
    .then((media) => {
      if (!media) {
        throw new HTTP404Error();
      }

      let src = media.src;
      if (parseInt(media.type, 10) === mediaTypes.VIDEO) {
        src = `${req.protocol}://www.youtube.com/embed/${media.videoID
          }?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=${req.protocol}://${
            req.get('host')}&playsinline=1&rel=0&controls=0`;
      }

      const props = Object.assign({}, media);
      props.src = src;
      props.canEdit = (!!(req.user && req.user.isAdmin));

      const data = {
        title: `${media.title} | ${res.locals.title}`,
        props: props,
      };

      res.render('player', data);

      return media._id;
    })
    .then(_id => db(tables.MEDIA)
      .updateOne({ _id }, { $inc: { 'stats.views': 1, 'stats.allTime': 1 } })
      .then(result => _id) // for debugging
    )
    .catch((err) => {
      if (err.name === 'HTTP404Error') {
        res.status(404).send('not found'); // improve
      } else {
        next(err);
      }
    });
  });

  app.get('/', (req, res) => {
    res.render('home', {
      title: 'Nno! Kezie.com',
    });
  });

  app.post('/api/logError', (req, res) => {
    res.end();
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

    // todo: make async / then later, send with separate script
    mailer.send(JSON.stringify(error), 'client error');
  });

  app.get('/api/carousel', (req, res, next) => {
    db(tables.MEDIA)
      .find({ img: { $regex: 'ytimg' }, status: 'published' })
      .toArray()
      .then((videos) => {
        res.render('sub/carousel', { videos: videos.slice(0, 3), carouselIDquery: '#main-carousel' });
      })
      .catch(next);
  });

  app.get('/api/rankings', (req, res, next) => {
    db(tables.MEDIA).find({ status: 'published' }).sort({ totalViews: -1 }).toArray()
    .then((videos) => {
      res.render('sub/media_list', { videos: videos.slice(0, 10) });
    })
    .catch(next);
  });

  app.get('/api/list/audio', (req, res, next) => {
    db(tables.MEDIA).find({ img: { $not: new RegExp('ytimg') }, status: 'published' })
    .toArray()
    .then((videos) => {
      res.render('sub/horizontal-slider', { videos: videos });
    })
    .catch(next);
  });

  app.get('/new_music', ensureLoggedIn(), requireRole('admin'), (req, res, next) => {
    db(tables.CHANGESETS).insertOne({ user: req.user._id, type: 'new' }).then((result) => {
      const changesetID = result.insertedId.toString();
      res.append('Inserted-Id', result.insertedId);
      res.render('new_music', { title: `New Music | ${res.locals.title}`, changesetID });
    })
    .catch(next);
  });

  // temp
  const sanitize = text => text;

  function validateMedia(body) {
    const newMedia = {};
    newMedia.title = sanitize(body.title);
    newMedia.artist = sanitize(body.artist);
    newMedia.img = sanitize(body.img);
    newMedia.src = sanitize(body.src);
    newMedia.videoID = sanitize(body.videoID);
    newMedia.type = parseInt(body.type, 10);
    // no client generated object being stored directly in server
    return newMedia;
  }

  // to do: consider '/api/media/:changeset/new'
  app.post('/api/media/new', ensureLoggedIn(), requireRole('admin'), (req, res, next) => {
    const newMedia = validateMedia(req.body);
    newMedia.creator = req.user._id;
    newMedia.status = 'published';
    newMedia.slug = slugify(newMedia.title);
    newMedia.version = 1;
    newMedia.stats = {
      views: 0,
      history: [],
      weeklyTotal: 0,
      allTime: 0,
    };
    newMedia.changeset = ObjectId(req.body.changesetID); // should it be a param??
    db(tables.MEDIA).insertOne(newMedia).then((result) => {
      res.append('Inserted-Id', result.insertedId);
      res.send(newMedia.slug);

      db(tables.CHANGESETS).updateOne({
        _id: newMedia.changeset },
        { $set: { media: newMedia._id } }
      );
    })
    .catch(next);
  });

  app.get('/history', ensureLoggedIn(), (req, res) => {
    const props = {
      userID: req.user._id,
    };

    res.render('profile', {
      title: `My History | ${res.locals.title}`,
      props,
    });
  });

 /*
  app.get('/test', ensureLoggedIn(), (req, res) => {
    res.render('test-runner', { });
  });
 */
  app.get('/music/:slug/history', ensureLoggedIn(), (req, res, next) => {
    const slug = req.params.slug;

    db(tables.MEDIA).findOne({ slug: slug }).then((media) => {
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

  app.get('/api/spotify/token', (req, res, next) => {
    getSpotifyToken(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET).then((t) => {
      res.send(t);
    }).catch(next);
  });

  app.get('/api/changesets/list', ensureLoggedIn(), (req, res, next) => {
    const queryDoc = {};
    if ('userID' in req.query) {
      queryDoc.user = req.query.userID ? ObjectId(req.query.userID) : req.user._id;
    }
    if ('mediaID' in req.query) {
      queryDoc.media = ObjectId(req.query.mediaID);
    }
    if ('fromID' in req.query) {
      queryDoc._id = { $lt: ObjectId(req.query.fromID) };
    }

    db(tables.CHANGESETS).find(queryDoc).sort({ _id: -1 }).limit(10)
      .toArray()
      .then((changesets) => {
        res.send(changesets);
      })
      .catch(next);
  });

  app.get('/api/media/:mediaID', (req, res, next) => {
    db(tables.MEDIA).findOne({ _id: ObjectId(req.params.mediaID) })
      .then((media) => {
        res.send(media);
      })
      .catch(next);
  });

  // Todo: complete
  function validate(line) {
    const newLine = {};
    newLine.startTime = parseInt(line.startTime, 10);
    newLine.endTime = parseInt(line.endTime, 10);
    newLine.text = sanitize(line.text);
    // no client generated object being stored directly in server
    return newLine;
  }

  app.post('/api/start_edit/:mediaID', ensureLoggedIn(), (req, res, next) => {
    db(tables.MEDIA).findOne({ _id: ObjectId(req.params.mediaID) })
      .then((media) => {
        if (media.pendingRollbacks && (media.pendingRollbacks.length > 0)) {
          res.status(403).send('ROLLBACK_IN_PROGRESS');
        } else {
          db(tables.CHANGESETS).insertOne({
            type: 'edit',
            user: req.user._id,
            media: ObjectId(req.params.mediaID),
            revisions: [],
          }).then((result) => {
            const changesetID = result.insertedId.toString();
            res.send(changesetID);
          });
        }
      }).catch(next);
  });

  app.post('/api/media/:mediaID/updateLine', ensureLoggedIn(), (req, res, next) => {
    // TODO: ensure request is correctly formatted
    const r = new Revision(db);
    r.execute(req.body.changesetID, req.params.mediaID, revisionTypes.LINE_EDIT, req.body)
      .then((line) => {
        sendLines(line.media, res, next);
      })
      .catch(next);
  });

  app.post('/api/media/:mediaID/addline', ensureLoggedIn(), (req, res, next) => {
    // TODO: ensure request is correctly formatted
    const r = new Revision(db);

    const newLine = validate(req.body);
    newLine.creator = req.user._id;

    r.execute(req.body.changesetID, req.params.mediaID, revisionTypes.LINE_ADD, newLine)
      .then((result) => {
        res.append('Inserted-Id', result.insertedId); // for easy debugging
        sendLines(ObjectId(req.params.mediaID), res, next);
      }).catch(next);
  });

  app.post('/api/media/:mediaID/updateInfo', (req, res, next) => {
    // TODO: ensure request is correctly formatted
    const newTitle = req.body.changes.title;
    if (newTitle) {
      req.body.changes.slug = slugify(req.body.changes.title);
    }

    const r = new Revision(db);
    r.execute(req.body.changesetID, req.params.mediaID, revisionTypes.INFO_EDIT, req.body)
      .then((media) => {
        res.send(media);
      })
      .catch(next);
  });

  app.use((err, req, res, next) => {
    // move error logging here, but should probably be in a try block
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

  app.start = () => new Promise((resolve, reject) => {
    const port = env.PORT;
    const server = app.listen(port, () => {
      console.log(`Kezie server listening on port ${port}!`);
      resolve({
        server,
        db,
      });
    }).on('error', reject); // todo: better handle
  });

  // go ahead and start, or just return app object
  if (start) return app.start();

  app.database = db;
  return Promise.resolve(app);
}

function run(env, _start) {
  const envVars = [
    'HOST',
    'PORT',
    'FB_CLIENT_ID',
    'FB_CLIENT_SECRET',
    'DB_URL',
    'TWITTER_CONSUMER_KEY',
    'TWITTER_CONSUMER_SECRET',
    'DEVELOPER_IP',
    'EMAIL_ADDRESS',
    'EMAIL_PASSWORD',
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET'
  ];

  try {
    if ((typeof env === 'undefined') || (env === null)) {
      throw new Error('Missing "env" parameter');
    }
    envVars.forEach((variable) => {
      if (!(env[variable])) {
        throw new Error(`Missing environment variable "${variable}"`);
        // console.error(`Missing environment variable "${variable}"`);
        // process.exit(1);
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }

  const start = (typeof _start === 'undefined') ? true : _start;
  return connectDB(env.DB_URL).then(db => startServer(db, env, start));
}

export default run;
