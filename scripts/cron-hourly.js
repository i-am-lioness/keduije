const connectDB = require('../dist/db');
const reviewChanges = require('../dist/review-changes');
const recovery = require('../dist/recovery');

require('dotenv').config();

let db;

connectDB(process.env.DB_URL)
  .then((_db) => {
    db = _db;
    return reviewChanges(db);
  })
  .then(() => recovery(db))
  .then(() => db._DB.close())
  .then(() => {
    process.exit();
  });

// TO DO: catch rejections
