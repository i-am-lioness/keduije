/* eslint-env mocha */
import { expect } from 'chai';
import calcStats from '../lib/calc-stats';
import { tables } from '../lib/constants';
import TestDB from './utils/db';
import populate from './utils/populate-db';

let db;
let populator;

function getMedia(_id) {
  return db(tables.MEDIA).findOne({ _id });
}

describe('calc-stats.js', () => {
  let _id;
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
      populator = populate(db);
      return populator.addMedia()
        .then((id) => {
          _id = id;
        });
    });
  });

  after(function () {
    return TestDB.close();
  });

  it('should total last 5 daily view counts', function () {
    this.timeout(5000);

    function incrementViewsAndBackUp(views) {
      return db(tables.MEDIA)
        .updateOne({ _id }, { $set: { 'stats.views': views } })
        .then(() => calcStats(db));
    }
    function repeat(cnt) {
      return incrementViewsAndBackUp(50).then(() => {
        if (cnt > 0) {
          return repeat(cnt - 1);
        }
        return null;
      });
    }

    return repeat(9).then(() => getMedia(_id)).then((media) => {
      expect(media.stats.weeklyTotal).to.equal(350);
    });
  });
});
