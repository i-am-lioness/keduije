const connectDB = require('../dist/db');
const reviewChanges = require('../dist/review-changes');
const backupMedia = require('../dist/backup');
const aggegateViewCounts = require('../dist/calc-stats');

require('dotenv').config();

let db;

function logError(err) {
  console.error(err);
}

connectDB(process.env.DB_URL)
  .then((_db) => {
    db = _db;
    return reviewChanges(db);
  })
  .catch(logError)
  .then(() => backupMedia(db))
  .catch(logError)
  .then(() => aggegateViewCounts(db))
  .catch(logError)
  .then(() => db._DB.close())
  .then(() => {
    process.exit();
  });
