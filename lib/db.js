import { tables } from './constants';

const MongoClient = require('mongodb').MongoClient;

function connectDB(url) {
  function onDbConnectFail(err) {
    console.error(`Failed to connect to DB at URL:${url}`);
    console.error(err);
    throw err;
  }

  return MongoClient.connect(url).then((database) => {
    function getCollection(collection) {
      switch (collection) {
        case tables.LINES:
          return database.collection('lines');
        case tables.MEDIA:
          return database.collection('media');
        case tables.CHANGESETS:
          return database.collection('changesets');
        case tables.REVISIONS:
          return database.collection('revisions');
        case tables.USERS:
          return database.collection('users');
        case tables.LOGS:
          return database.collection('logs');
        case tables.SNAPSHOTS:
          return database.collection('snapshots');
        case tables.SESSIONS:
          return database.collection('sessions');
        default:
          throw new Error(`unknown collection name ${collection}`);
      }
    }
    getCollection._DB = database;
    return getCollection;
  }).catch(onDbConnectFail);
}

export default connectDB;
