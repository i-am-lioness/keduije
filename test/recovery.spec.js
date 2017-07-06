/* eslint-env mocha */
import { expect } from 'chai';
import TestDB from './utils/db';
import recovery from '../lib/recovery';
import { states } from '../lib/revision';
import { tables } from '../lib/constants';

function Revision(_db) {
  function execute(r) {
    return _db(tables.REVISIONS).deleteOne({ _id: r._id });
  }

  this.recover = execute;
}

function Rollback(_db) {
  function execute(r) {
    return _db(tables.CHANGESETS).updateOne({ _id: r._id }, { state: 'done' });
  }

  this.recover = execute;
}

let db;
let revertRevision;
let revertRollback;

describe('recovery.js', function () {
  before(function () {
    revertRevision = recovery.__Rewire__('Revision', Revision);
    revertRollback = recovery.__Rewire__('Rollback', Rollback);
    return TestDB.open().then(function (database) {
      db = database;
    });
  });

  after(function () {
    debugger;
    revertRevision();
    revertRollback();
    return TestDB.close();
  });

  describe('revisions', function () {
    const rArray = [];
    let rState;
    for (let i = 0; i < 30; i += 1) {
      rState = Object.values(states)[i % 4];
      rArray.push({ state: rState, lastModified: new Date(0) });
    }
    let revisionTableCnt;
    before(function () {
      this.timeout(5000);
      return db(tables.REVISIONS).insertMany(rArray)
        .then(() => db(tables.REVISIONS).count())
        .then((cnt) => {
          debugger;
          revisionTableCnt = cnt;
          return recovery(db);
        });
    });

    it('clears revision table', function () {
      expect(revisionTableCnt).to.equal(30);
      return db(tables.REVISIONS).count()
        .then((cnt) => {
          expect(cnt).to.equal(0);
        });
    });

    it('only clears revisions outside of time threshold');
  });

  describe('rollbacks', function () {
    const rArray = [];
    let rState;
    const rollBackStates = ['applied', 'initiated', 'pending'];
    for (let i = 0; i < 30; i += 1) {
      rState = rollBackStates[i % 3];
      rArray.push({ type: 'rollback', state: rState, lastModified: new Date(0) });
    }
    let rollbackCnt;
    before(function () {
      this.timeout(5000);
      return db(tables.CHANGESETS).insertMany(rArray)
        .then(() => db(tables.CHANGESETS).count({ state: 'done' }))
        .then((cnt) => {
          debugger;
          rollbackCnt = cnt;
          return recovery(db);
        });
    });

    it('clears pending rollbacks', function () {
      expect(rollbackCnt).to.equal(0);
      return db(tables.CHANGESETS).count({ state: 'done' })
        .then((cnt) => {
          expect(cnt).to.equal(30);
        });
    });
  });
});
