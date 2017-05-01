/* eslint-env mocha */
import { expect } from 'chai';
import backup from '../lib/backup';
import TestDB from './utils/db';
import populate from './utils/populate-db';

let db;
let populator;

function getMedia(_id) {
  return db.collection('media').findOne({ _id });
}

describe('backup.js', () => {
  let _id;
  const lineCount = 11;
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
      populator = populate(db);
      return populator.addMedia()
        .then((id) => {
          _id = id;
          return populator.addLines(lineCount);
        });
    });
  });

  after(function () {
    return TestDB.close();
  });

  it('should add an "archive" field to the media object', function () {
    return backup(db).then(() => getMedia(_id)).then((media) => {
      expect(media).to.haveOwnProperty('archive');
      expect(media.archive).to.be.an('array');
      expect(media.archive).to.have.lengthOf(1);
      expect(media.archive[0]).to.haveOwnProperty('date');
      expect(media.archive[0]).to.haveOwnProperty('info');
      expect(media.archive[0]).to.haveOwnProperty('lines');
      expect(media.archive[0].lines).to.be.an('array');
      expect(media.archive[0].lines).to.have.lengthOf(lineCount);
    });
  });

  it('should not have store more than 5 snapshots', function () {
    this.timeout(5000);
    function repeat(cnt) {
      return backup(db).then(() => {
        if (cnt > 0) {
          return repeat(cnt - 1);
        }
        return null;
      });
    }

    return repeat(9).then(() => getMedia(_id)).then((media) => {
      expect(media.archive).not.to.have.length.above(5);
    });
  });

  it('should total last 5 daily view counts', function () {
    this.timeout(5000);

    function incrementViewsAndBackUp(views) {
      return db.collection('media')
        .updateOne({ _id }, { $set: { 'stats.views': views } })
        .then(() => backup(db));
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
