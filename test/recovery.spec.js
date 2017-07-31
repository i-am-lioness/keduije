/* eslint-env mocha */
import { expect } from 'chai';
import sinon from 'sinon';
import TestDB from './utils/db';
import { errorDB } from './utils/mocks';
import recovery from '../lib/recovery';
import { tables } from '../lib/constants';

function Revision(_db) {
  function execute(r) {
    if (r.forceFail) {
      return Promise.reject();
    }
    return _db(tables.REVISIONS).deleteOne({ _id: r._id });
  }

  this.recover = execute;
}

function Rollback(_db) {
  function execute(r) {
    if (r.forceFail) {
      return Promise.reject();
    }
    return _db(tables.CHANGESETS).updateOne({ _id: r._id }, { state: 'done' });
  }

  this.recover = execute;
}

let db;
let log;
let consoleError;

describe('recovery.js', function () {
  before(function () {
    recovery.__Rewire__('Revision', Revision);
    recovery.__Rewire__('Rollback', Rollback);
    log = sinon.spy(console, 'log');
    consoleError = sinon.spy(console, 'error');
    return TestDB.open().then(function (database) {
      db = database;
    });
  });

  after(function () {
    log.restore();
    consoleError.restore();
    debugger;
    recovery.__ResetDependency__('Revision');
    recovery.__ResetDependency__('Rollback');
    return TestDB.close();
  });

  describe('for revisions', function () {
    const rArray = [];
    let error = null;
    for (let i = 0; i < 30; i += 1) {
      const forceFail = !(i % 5); // fail every 5th revision [0, 5, 10, 15, 20, 25]
      const lastModified = (i < 18) ? new Date(0) : new Date();
        // this leaves 4 failures + 12 never processed
      rArray.push({ lastModified, forceFail });
    }

    before(function () {
      this.timeout(5000);
      return db(tables.REVISIONS).insertMany(rArray)
        .then(() => db(tables.REVISIONS).count())
        .then((cnt) => {
          expect(cnt).to.equal(30);
          return recovery(db);
        })
        .catch((err) => {
          error = err;
        });
    });

    after(function () {
      log.reset();
      consoleError.reset();
      return db(tables.REVISIONS).deleteMany();
    });

    // ✓ GOOD
    it('logs indiviidual errors, without rejecting', function () {
      expect(error).to.be.null;
      expect(consoleError.callCount).to.equal(4);
    });

    // ✓ GOOD
    it('just clears revisions outside of time threshold', function () {
      const resSpy = log.withArgs('recovering pending revision:', sinon.match.any);
      expect(resSpy.callCount).to.equal(18);
    });
  });

  describe('on failure', function () {
    let error = null;
    before(function () {
      return recovery(errorDB)
        .catch((err) => {
          error = err;
        });
    });

    after(function () {
      log.reset();
      consoleError.reset();
    });

    // ✓ GOOD
    it('should log error and proceed without rejecting', function () {
      expect(error).to.be.null;
      expect(consoleError.calledTwice).to.be.true;
    });
  }); // describe('on failure'

  describe('rollbacks', function () {
    let finalChangesetCnt;
    let recoverError = null;

    function prep(arr) {
      debugger;
      return db(tables.CHANGESETS).insertMany(arr)
        .then(() => recovery(db))
        .then(() => db(tables.CHANGESETS).count({ state: 'done' }))
        .then((cnt) => {
          finalChangesetCnt = cnt;
        })
        .catch((err) => {
          recoverError = err;
        });
    }

    function rollbackIt(rArray, spec, test) {
      it(spec, function () {
        this.timeout(5000);
        return prep(rArray).then(test);
      });
    }
    rollbackIt.only = (rArray, spec, test) => {
      it.only(spec, function () {
        this.timeout(5000);
        return prep(rArray).then(test);
      });
    };

    afterEach(function () {
      log.reset();
      consoleError.reset();
      recoverError = null;
      return db(tables.CHANGESETS).deleteMany();
    });

    const type = 'rollback';
    const rArray0 = [];
    const rollBackStates = ['applied', 'initiated', 'pending', 'done', 'canceled'];
    for (let i = 0; i < 100; i += 1) {
      const state = rollBackStates[i % 5]; // 60 + 20
      const lastModified = new Date(0);
      rArray0.push({ state, lastModified, type });
    }
    // ✓ GOOD
    rollbackIt(rArray0, 'should just process rollbacks that are pending, initiated, or applied', function () {
      expect(finalChangesetCnt).to.be.at.equal(80);
      expect(consoleError.callCount).to.equal(0);
      expect(recoverError).not.to.be.ok;
    });

    const rArray1 = [];
    for (let i = 0; i < 100; i += 1) {
      const state = 'pending';
      const lastModified = new Date(0);
      const forceFail = !(i % 10);
      rArray1.push({ state, lastModified, forceFail, type });
    }
    // ✓ GOOD
    rollbackIt(rArray1, 'should handle individual errors without rejecting', function () {
      expect(finalChangesetCnt).to.be.at.equal(90);
      expect(consoleError.callCount).to.equal(10);
      expect(recoverError).not.to.be.ok;
    });

    const rArray2 = [];
    for (let i = 0; i < 100; i += 1) {
      const state = 'pending';
      const lastModified = (i % 20) ? new Date(0) : new Date();
      rArray2.push({ state, lastModified, type });
    }
    // ✓ GOOD
    rollbackIt(rArray2, 'should honor time threshold', function () {
      expect(finalChangesetCnt).to.be.at.equal(95);
      expect(consoleError.callCount).to.equal(0);
      expect(recoverError).not.to.be.ok;
    });

    const rArray3 = [];
    for (let i = 0; i < 100; i += 1) {
      const state = 'pending';
      const lastModified = new Date(0);
      const type0 = (i % 2) ? 'rollback' : 'new';
      rArray3.push({ state, lastModified, type: type0 });
    }
    // ✓ GOOD
    rollbackIt(rArray3, 'should just process rollbacks within changesets', function () {
      expect(finalChangesetCnt).to.be.at.equal(50);
      expect(consoleError.callCount).to.equal(0);
      expect(recoverError).not.to.be.ok;
    });
  }); // describe('rollbacks')
});
