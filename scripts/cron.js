import connectDB from '../lib/db';

const reviewChanges = require('../lib/review-changes');
require('dotenv').config();

let db;

connectDB(process.env.DB_URL).then((_db) => {
  db = _db;
  return reviewChanges(db);
}).then(() => {
  db._DB.close();
  process.exit();
});
