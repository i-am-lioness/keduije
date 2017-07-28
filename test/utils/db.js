import connectDB from '../../lib/db';

require('dotenv').config();

// const DB_URL = process.env.TEST_DB_URL;
const DB_URL = process.env.LOCAL_DB ? process.env.LOCAL_DB_URL : process.env.TEST_DB_URL;

module.exports = (() => {
  let db;
  function open() {
    return connectDB(DB_URL).then((_db) => {
      db = _db._DB;
      return _db;
    });
  }

  function clear(_db) {
    db = db || _db._DB;
    return db.collections().then(function (collections) {
      const deletions = [];
      collections.forEach((c) => {
        if (!c.collectionName.startsWith('system.')) {
          console.log(`deleting ${c.collectionName}`);
          deletions.push(db.dropCollection(c.collectionName));
        }
      });

      return Promise.all(deletions);
    });
  }

  function close(_db) {
    db = db || _db._DB;
    return clear().then(() => db.close);
  }
  return { open, close, clear };
})();

