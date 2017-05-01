require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const recovery = require('../lib/recovery');
// const archiveLyrics = require('../lib/backup');
// const aggregateActvity = require('../lib/compile-changests');

MongoClient.connect(process.env.DB_URL, (err, db) => {
  console.log('Connected successfully to db');

  recovery(db)
    .then(() => {
      console.log('Done with recovery. Closing.');
      db.close();
      process.exit();
    });
});

