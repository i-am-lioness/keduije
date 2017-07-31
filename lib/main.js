/* eslint no-process-env: 0 */
import app from './app';

require('dotenv').config();

// TEST CASE: handles rejections
app(process.env).catch((err) => {
  console.error(err);
  process.exit(-1);
});
