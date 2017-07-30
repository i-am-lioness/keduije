/* eslint-env mocha */
import { expect } from 'chai';
import { ObjectId } from 'mongodb';
import Rollback, { getMediaInfo } from '../lib/rollback';
import TestDB from './utils/db';
import { tables, states } from '../lib/constants';
import populate from './utils/populate-db';

let db;

function loadData() {
  const populator = populate(db);
  return populator.loadSnapshots()
    .then(function () {
      return populator.loadMedia();
    }).then(function () {
      return populator.loadLines();
    });
}

describe('rollback.js', function () {
  before(function () {
    return TestDB.open()
      .then(function (database) {
        db = database;
      });
  });

  after(function () {
    debugger;
    return TestDB.close();
  });

  describe('for simple media object', function () {
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

    after(function () {
      return TestDB.clear(db);
    });

    // ✓ GOOD
    it('has number of lines match total number of lines in snapshot', function () {
      expect(preRollbackLines).to.not.equal(snapshot.lines.length);
      return db(tables.LINES).count(lineQuery)
        .then((cnt) => {
          expect(cnt).to.equal(snapshot.lines.length);
        });
    });

    // ✓ GOOD
    it('does not include lines that were added after the snapshot', function () {
      return db(tables.LINES).count({ text: 'd' }).then((cnt) => {
        expect(cnt).to.equal(0);
        return db(tables.LINES).count({ text: 'c' });
      }).then((cnt) => {
        expect(cnt).to.equal(1);
      });
    });

    // ✓ GOOD
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

  // ✓ GOOD
  it('can handle invalid rollback state', function () {
    const r = new Rollback(db);
    return r.recover({ state: 0 }).catch(err => err)
      .then((err) => {
        expect(err).to.be.an('error');
        expect(err.message).to.match(/unrecognized state/);
      });
  });

  it('can handle invalid snapshot');

  it('can cancel');

  it('marks rolledback changesets');

  it('should never have toBackup set to true after rollback');

  it('should preserve history');

  [states.PENDING, states.INITIATED, states.APPLIED].forEach((state) => {
    describe(`recovery from ${state}`, function () {
      let currentSnapshot;
      let rollbackDoc;
      let originalLineCnt;
      // let originalMediaDoc;
      let finalMediaDoc;

      before(function () {
        let rollback;

        return loadData()
          .then(() => db(tables.SNAPSHOTS).findOne())
          .then(function (ss) {
            expect(ss).to.be.ok;
            currentSnapshot = ss;

            return db(tables.LINES).count({ media: currentSnapshot.media });
          })
          .then(function (cnt) {
            originalLineCnt = cnt;
            console.log('originalLineCnt', originalLineCnt);
            expect(originalLineCnt).not.to.equal(currentSnapshot.lines.length);
            return db(tables.MEDIA).findOne({ _id: currentSnapshot.media });
          })
          .then(function () {
            // originalMediaDoc = m;
            // console.log('currentMedia', originalMediaDoc);

            rollback = {
              type: 'rollback',
              state,
              snapshot: currentSnapshot._id,
            };

            return db(tables.CHANGESETS).insertOne(rollback);
          })
          .then(() => {
            if ((state === states.INITIATED) || (state === states.APPLIED)) {
              const queryObj = {
                _id: currentSnapshot.media,
                pendingRollbacks: { $ne: rollback._id },
              };
              const updateObj = {
                $push: { pendingRollbacks: rollback._id },
                $currentDate: { lastModified: true },
                $set: getMediaInfo(currentSnapshot),
              };

              rollback.snapshot = currentSnapshot;
              rollback.media = currentSnapshot.media;

              return db(tables.MEDIA).findOneAndUpdate(queryObj, updateObj);
            }
            return null;
          })
          .then(() => {
            if (state === states.APPLIED) {
              const queryObj = { media: rollback.media };
              return db(tables.LINES).deleteMany(queryObj)
                .then(() => db(tables.LINES).insertMany(rollback.snapshot.lines));
            }
            return null;
          })
          .then(() => {
            const r = new Rollback(db);
            return r.recover(rollback);
          })
          .then((doc) => {
            rollbackDoc = doc;
            return db(tables.MEDIA).findOne({ _id: currentSnapshot.media });
          })
          .then((doc) => {
            finalMediaDoc = doc;
          });
      });

      after(function () {
        return TestDB.clear(db);
      });

      // ✓ GOOD
      it('clears pending rollbacks in media doc', function () {
        expect(finalMediaDoc.pendingRollbacks).to.be.empty;
      });

      // ✓ GOOD
      it('goes to state of completion', function () {
        expect(rollbackDoc).to.be.an('object');
        expect(rollbackDoc.state).to.equal(states.DONE);
      });

      // ✓ GOOD
      it('loads all lines in snapshot', function () {
        return db(tables.LINES)
          .count({ media: currentSnapshot.media })
          .then(function (cnt) {
            console.log('finalLineCnt', cnt);
            expect(cnt).to.equal(currentSnapshot.lines.length);
          });
      });
    }); // describe('recovery from pending')
  });
});
