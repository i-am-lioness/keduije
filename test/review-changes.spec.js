/* eslint-env mocha */
import { expect } from 'chai';
import reviewChanges from '../lib/review-changes';
import TestDB from './utils/db';
import populate from './utils/populate-db';
import { tables } from '../lib/constants';
import { errorDB } from './utils/mocks';

let db;
let populator;

const TOTAL_CHANGESET_CNT = 22;
const ORIGINAL_PROCESSED_CNT = 15;
const ORIGINAL_TOBACKUP_CNT = 3;
const EXPECTED_BACKUP_CNT = 4;
const ORIGINAL_EMPTY_CHANGESET_CNT = 2;

let changesetToRecover;

function removeMediaFieldFromChangeset() {
  return db(tables.CHANGESETS).findOneAndUpdate(
    { type: 'new', processed: { $ne: true }, media: { $exists: true } },
    { $unset: { media: '' } },
  ).then(result => result.value);
}

describe('review-changes.js', function () {
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
      populator = populate(db);
      return populator.loadChangesets()
        .then(populator.loadMedia)
        .then(removeMediaFieldFromChangeset)
        .then((res) => {
          changesetToRecover = res;
          debugger;
        });
    });
  });

  after(function () {
    debugger;
    return TestDB.close();
  });

  describe('reviewChanges', function () {
    let changesets;
    let originalNewChangesetWithMediaCnt;
    before(function () {
      return db(tables.CHANGESETS).count({ processed: true })
        .then((cnt) => {
          expect(cnt).to.equal(ORIGINAL_PROCESSED_CNT);
          return db(tables.CHANGESETS).count({ type: 'new', media: { $exists: true } });
        })
        .then((cnt) => {
          originalNewChangesetWithMediaCnt = cnt;
          return db(tables.MEDIA).count({ toBackup: true });
        })
        .then((cnt) => {
          expect(cnt).to.equal(ORIGINAL_TOBACKUP_CNT);
          return reviewChanges(db);
        })
        .then(() => db(tables.CHANGESETS).find().toArray())
        .then((arr) => {
          changesets = arr;
        });
    });

    // ✓ GOOD
    it('should recover media creation changeset with missing media field', function () {
      return db(tables.CHANGESETS)
        .count({ type: 'new', media: { $exists: true } })
        .then((cnt) => {
          expect(cnt).to.equal(originalNewChangesetWithMediaCnt + 1);
          return db(tables.CHANGESETS).findOne({ _id: changesetToRecover._id });
        })
        .then((doc) => {
          expect(doc).to.haveOwnProperty('media');
        });
    });

    // ✓ GOOD
    it('leaves no changesets without revisions or media', function () {
      changesets.forEach((cs) => {
        expect(cs).to.haveOwnProperty('media');
        expect(cs.media).not.to.be.an('object');
        expect(cs).not.to.haveOwnProperty('lines');
        if (cs.type === 'new') {
          expect(cs).not.to.haveOwnProperty('revisions');
        } else {
          expect(cs).to.haveOwnProperty('revisions');
          expect(cs.revisions).to.have.length.greaterThan(0);
        }
      });
    });

    // ✓ GOOD
    it('should only have as many "new" changesets as there are media', function () {
      return db(tables.MEDIA).count().then((cnt) => {
        let newCnt = 0;
        changesets.forEach((cs) => {
          if (cs.type === 'new') newCnt += 1;
        });
        expect(cnt).to.equal(newCnt);
      });
    });

    // ✓ GOOD
    it('flags all changesets as processed', function () {
      return db(tables.CHANGESETS).count({ processed: { $ne: true } }).then((cnt) => {
        expect(cnt).to.equal(0);
      });
    });

    // ✓ GOOD
    it('removes all extraneous changesets', function () {
      expect(changesets.length).to.equal(TOTAL_CHANGESET_CNT - ORIGINAL_EMPTY_CHANGESET_CNT);
    });

    // ✓ GOOD
    it('removes "edit" changesets without revisions', function () {
      return db(tables.CHANGESETS).count({ type: 'edit', revisions: { $size: 0 } }).then((cnt) => {
        expect(cnt).to.equal(0);
      });
    });

    // ✓ GOOD
    it('removes "new" changesets affiliated media', function () {
      return db(tables.CHANGESETS).count({ type: 'new', media: { $exists: false } }).then((cnt) => {
        expect(cnt).to.equal(0);
      });
    });

    // ✓ GOOD
    it('turns on backup flag for updated media', function () {
      return db(tables.MEDIA).count({ toBackup: true }).then((cnt) => {
        expect(cnt).to.equal(EXPECTED_BACKUP_CNT);
      });
    });

    // ✓ GOOD
    it('during aggegation handles error', function () {
      return reviewChanges(errorDB).catch(err => err).then((err) => {
        expect(err).to.be.ok;
        expect(err).to.be.an.instanceOf(Error);
      });
    });
  });
});
