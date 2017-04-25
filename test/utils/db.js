const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

const DB_URL = process.env.TEST_DB_URL;

module.exports = (() => {
  let db;
  function open() {
    return MongoClient.connect(DB_URL).then((_db) => {
      db = _db;
      return db;
    });
  }

  function close(_db) {
    db = db || _db;
    return db.collections().then(function (collections) {
      const deletions = [];
      collections.forEach((c) => {
        if (!c.collectionName.startsWith('system.')) {
          console.log(`deleting ${c.collectionName}`);
          deletions.push(db.dropCollection(c.collectionName));
        }
      });

      return Promise.all(deletions).then(() => db.close);
    });
  }
  return { open, close };
})();

