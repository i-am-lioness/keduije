import connectDB from '../lib/db';

const aggregateActvity = require('../lib/compile-changests');
require('dotenv').config();
// const recovery = require('../lib/recovery');
// const archiveLyrics = require('../lib/backup');

let db;

connectDB(process.env.DB_URL).then((_db) => {
  db = _db;
  return aggregateActvity(db);
}).then(() => {
  db._DB.close();
  process.exit();
});
