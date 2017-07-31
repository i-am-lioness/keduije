const connectDB = require('../dist/db');
const reviewChanges = require('../dist/review-changes');
const recovery = require('../dist/recovery');

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
  .then(() => recovery(db))
  .catch(logError)
  .then(() => db._DB.close())
  .then(() => {
    process.exit();
  });
