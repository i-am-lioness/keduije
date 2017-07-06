/* eslint-env mocha */
import { expect } from 'chai';
import { ObjectId } from 'mongodb';
import Rollback from '../lib/rollback';
import TestDB from './utils/db';
import { tables } from '../lib/constants';

let db;

describe('rollback.js', function () {
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
    });
  });

  after(function () {
    debugger;
    return TestDB.close();
  });

  describe('back up simple media object', function () {
    const mediaToRollback = {
      _id: ObjectId(1),
      artist: 'phyno',
      title: 'SFSG',
    };

    let lines = ['a', 'b', 'c'];
    lines = lines.map(x => ({ text: x, media: mediaToRollback._id }));
    const snapshot = {
      _id: ObjectId(2),
      lines,
      media: mediaToRollback._id,
    };

    const addedLine = { text: 'd', media: mediaToRollback._id };

    const lineQuery = { media: mediaToRollback._id };
    let preRollbackLines;

    before(function () {
      return db(tables.LINES).insertMany(lines)
        .then(() => db(tables.LINES).insertOne(addedLine))
        .then(() => db(tables.SNAPSHOTS).insertOne(snapshot))
        .then(() => db(tables.MEDIA).insert(mediaToRollback))
        .then(() => db(tables.LINES).count(lineQuery))
        .then((cnt) => {
          preRollbackLines = cnt;
          const r = new Rollback(db);
          return r.execute(snapshot._id.toString());
        });
    });

    it('has number of lines match total number of lines in snapshot', function () {
      expect(preRollbackLines).to.not.equal(snapshot.lines.length);
      return db(tables.LINES).count(lineQuery)
        .then((cnt) => {
          expect(cnt).to.equal(snapshot.lines.length);
        });
    });

    it('does not include lines that were added after the snapshot', function () {
      return db(tables.LINES).count({ text: 'd' }).then((cnt) => {
        expect(cnt).to.equal(0);
        return db(tables.LINES).count({ text: 'c' });
      }).then((cnt) => {
        expect(cnt).to.equal(1);
      });
    });

    it('restores "deleted" lines', function () {
      return db(tables.LINES).updateOne({ text: 'a' }, { $set: { deleted: true } })
        .then((result) => {
          expect(result.modifiedCount).to.equal(1);
          return db(tables.LINES).count({ deleted: true });
        }).then((cnt) => {
          expect(cnt).to.equal(1);
          const r = new Rollback(db);
          return r.execute(snapshot._id.toString());
        })
        .then(() => db(tables.LINES).count({ deleted: true }))
        .then((cnt) => {
          expect(cnt).to.equal(0);
        });
    });
  });

  it('removes pending rollbacks upon completion');

  it('can handle invalid snapshot');

  it('can cancel');

  it('marks rolledback changesets');

  describe('recovery', function () {
    it('can recover from pending');
    it('can recover from initial');
  });
});
