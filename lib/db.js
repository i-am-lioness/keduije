import { tables } from './constants';

const MongoClient = require('mongodb').MongoClient;

function connectDB(url) {
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
        default:
          throw new Error(`unknown collection name ${collection}`);
      }
    }
    getCollection._DB = database;
    return getCollection;
  });
}

export default connectDB;
