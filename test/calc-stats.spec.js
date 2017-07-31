/* eslint-env mocha */
import { expect } from 'chai';
import calcStats from '../lib/calc-stats';
import { tables } from '../lib/constants';
import TestDB from './utils/db';
import populate from './utils/populate-db';
import { errorDB, dbObjGenerator } from './utils/mocks';

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

  describe('calcStats', function () {
    let media;

    before(function () {
      this.timeout(5000);
      let allTime = 0;

      const dailyCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      function incrementViewsAndBackUp(views) {
        allTime += views;
        return db(tables.MEDIA)
          .updateOne({ _id }, { $set: {
            'stats.views': views,
            'stats.allTime': allTime,
          } })
          .then(() => calcStats(db));
      }
      function repeat(cnt) {
        const count = dailyCounts.shift();
        return incrementViewsAndBackUp(count).then(() => {
          if (cnt > 1) {
            return repeat(cnt - 1);
          }
          return null;
        });
      }

      return repeat(10)
        .then(() => getMedia(_id))
        .then((doc) => {
          media = doc;
        });
    });

    // ✓ GOOD
    it('should reset view count', function () {
      expect(media.stats.views).to.equal(0);
    });

    // ✓ GOOD
    it('maintain last 7 daily view counts', function () {
      expect(media.stats.history).to.be.an('array');
      expect(media.stats.history).to.deep.equal([4, 5, 6, 7, 8, 9, 10]);
    });

    // ✓ GOOD
    it('should never change alltime count', function () {
      expect(media.stats.allTime).to.equal(55);
    });

    // ✓ GOOD
    it('should total last 7 daily view counts', function () {
      expect(media.stats.weeklyTotal).to.equal(42);
    });
  });

  describe('failure', function () {
    // ✓ GOOD
    it('can handle scanning error', function () {
      return calcStats(errorDB).catch(err => err).then((err) => {
        expect(err).to.be.ok;
        expect(err).to.be.an.instanceOf(Error);
      });
    });

    // ✓ GOOD
    it('can handle individual update error', function () {
      const behavior = () => Promise.reject();
      const modifiedDB = dbObjGenerator(db, tables.MEDIA, 'updateOne', behavior);
      return calcStats(modifiedDB).catch((err) => {
        console.error(err);
        debugger;
        return err;
      }).then((result) => {
        expect(result).to.be.an('array');
      });
    });
  }); // describe('failure')
});
