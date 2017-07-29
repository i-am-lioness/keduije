/* eslint-env mocha */
import { expect } from 'chai';
import backupMedia from '../lib/backup';
import { tables } from '../lib/constants';
import TestDB from './utils/db';
import populate from './utils/populate-db';

let db;
let populator;

describe('backup.js', function () {
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
    const backupReadyCnt = 2;
    let mediaIDlist;
    let snapshots;
    before(function () {
      return db(tables.MEDIA)
        .find({ toBackup: true })
        .toArray()
        .then((mediaArr) => {
          mediaIDlist = mediaArr.map(el => el._id.toString());
          return backupMedia(db);
        })
        .then(() => db(tables.SNAPSHOTS).find().toArray())
        .then((ss) => {
          snapshots = ss;
        });
    });

    // ✓ GOOD
    it('backs up all media that are ready for backup', function () {
      expect(snapshots.length).to.equal(backupReadyCnt);
      snapshots.forEach((sn) => {
        expect(sn.media.toString()).to.be.oneOf(mediaIDlist);
      });
    });

    // ✓ GOOD
    it('turns off backup flag, once backed up', function () {
      expect(mediaIDlist.length).to.equal(backupReadyCnt);
      return db(tables.MEDIA).count({ toBackup: true }).then((cnt) => {
        expect(cnt).to.equal(0);
      });
    });

    // ✓ GOOD
    it('saves snapshot in expected format', function () {
      snapshots.forEach((ss) => {
        expect(ss).to.haveOwnProperty('title');
        expect(ss).to.haveOwnProperty('artist');
        expect(ss).to.haveOwnProperty('media');
        expect(ss).to.haveOwnProperty('lines');
        expect(ss.lines).to.be.an('Array');
      });
    });

    // ✓ GOOD
    it('saves all the lines for each media', function () {
      const queries = snapshots.map(ss =>
        db(tables.LINES)
          .count({ media: ss.media })
          .then(cnt => cnt),
      );

      return Promise.all(queries).then((counts) => {
        counts.forEach((cnt, i) => {
          expect(cnt).to.equal(snapshots[i].lines.length);
        });
      });
    });
  }); // describe('backupMedia')

  describe('backupMedia failure', function () {
    before(function () {
      backupMedia.__Rewire__('pipeline', [{ $matc: 0 }]);
    });

    after(function () {
      backupMedia.__ResetDependency__('pipeline');
    });

    // ✓ GOOD
    it('during aggegation handles error', function () {
      return backupMedia(db).catch(err => err).then((err) => {
        expect(err).to.be.ok;
        expect(err).to.be.an.instanceOf(Error);
      });
    });
  }); // describe('backupMedia')

  it('does not create snapshots when there are no back-up ready media');

  // it('it stores no more than 5 backups for a given media');
});
