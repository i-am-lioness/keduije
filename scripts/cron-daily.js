const connectDB = require('../dist/db');
const reviewChanges = require('../dist/review-changes');
const backupMedia = require('../dist/backup');
const aggegateViewCounts = require('../dist/calc-stats');

require('dotenv').config();

let db;

connectDB(process.env.DB_URL)
  .then((_db) => {
    db = _db;
    return reviewChanges(db);
  })
  .then(() => backupMedia(db))
  .then(() => aggegateViewCounts(db))
  .then(() => db._DB.close())
  .then(() => {
    process.exit();
  });

// TO DO: catch rejections
