/* eslint-env mocha */
import { ObjectId } from 'mongodb';
import { expect } from 'chai';
import backupMedia from '../lib/backup';
import TestDB from './utils/db';
import populate from './utils/populate-db';

let db;
let populator;

describe.only('backup.js', function () {
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
      populator = populate(db);
      return populator.loadLines()
        .then(populator.loadMedia);
    });
  });

  after(function () {
    debugger;
    return TestDB.close();
  });

  describe('backupMedia', function () {
    let backupReadyCnt;
    let unsavedMediaArr;
    before(function () {
      debugger;
      return db.collection('media')
        .updateMany(
          { _id: { $lte: ObjectId('590183ebb556696c1f377894') } },
          { $set: { toBackup: true } })
        .then((result) => {
          backupReadyCnt = result.modifiedCount;
          console.log(`backupReadyCnt: ${backupReadyCnt} `);
          return db.collection('media').find({ toBackup: true }).toArray();
        })
        .then((mediaArr) => {
          unsavedMediaArr = mediaArr;
          return backupMedia(db);
        });
    });

    it('backs up all media that are ready for backup', function () {
      return db.collection('snapshots').count().then((cnt) => {
        expect(cnt).to.equal(backupReadyCnt);
      });
    });

    it('turns off backup flag, once backed up', function () {
      unsavedMediaArr.forEach((m) => {
        expect(m.toBackup).to.be.true;
      });

      return db.collection('media').count({ toBackup: true }).then((cnt) => {
        expect(cnt).to.equal(0);
      });
    });

    it('saves snapshot in expected format', function (done) {
      db.collection('snapshots').find().forEach((ss) => {
        expect(ss).to.haveOwnProperty('title');
        expect(ss).to.haveOwnProperty('artist');
        expect(ss).to.haveOwnProperty('media');
        expect(ss).to.haveOwnProperty('lines');
        expect(ss.lines).to.be.an('Array');
      }, (err) => {
        done(err);
      });
    });

    describe('multiple rounds- ', function () {
      let backupReadyCnt2;
      before(function () {
        return db.collection('media')
          .updateMany(
            { _id: { $lt: ObjectId('590183ebb556696c1f377894') } },
            { $set: { toBackup: true } })
          .then((result) => {
            backupReadyCnt2 = result.modifiedCount;
            console.log(`backupReadyCnt2: ${backupReadyCnt2} `);
            return db.collection('media').find({ toBackup: true }).toArray();
          })
          .then((mediaArr) => {
            unsavedMediaArr = mediaArr;
            return backupMedia(db);
          });
      });

      it('only backs up media that has changed since last backup', function () {
        return db.collection('snapshots').count().then((cnt) => {
          expect(cnt).to.equal(backupReadyCnt2 + backupReadyCnt);
        });
      });
    });
  });

  it('does not create snapshots when there are no back-up ready media');

  // it('it stores no more than 5 backups for a given media');
});
