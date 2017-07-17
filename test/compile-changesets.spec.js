/* eslint-env mocha */
import { expect } from 'chai';
// import { ObjectId } from 'mongodb';
import aggregateActvity from '../lib/compile-changests';
import TestDB from './utils/db';
import populate from './utils/populate-db';
import { tables } from '../lib/constants';

let db;
let populator;
let changesetCnt = 0;

describe('compile-changesets.js', function () {
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
      populator = populate(db);
      return populator.loadChangesets()
        .then((cnt) => { changesetCnt = cnt; })
        .then(populator.loadMedia);
    });
  });

  after(function () {
    debugger;
    return TestDB.close();
  });

  describe('aggregateActvity', function () {
    let processedCnt;
    let toBackupCnt;
    before(function () {
      return db(tables.CHANGESETS).count({ processed: true })
        .then((cnt) => {
          processedCnt = cnt;
          return db(tables.MEDIA).count({ toBackup: true });
        })
        .then((cnt) => {
          toBackupCnt = cnt;
          return aggregateActvity(db);
        });
    });

    it('has no changesets without revisions or media', function (done) {
      let newCnt = 0;
      let editCnt = 0;
      db(tables.CHANGESETS).find().forEach((cs) => {
        expect(cs).to.haveOwnProperty('media');
        // debugger;
        // expect(cs.media).to.be.instanceOf(ObjectId);
        expect(cs.media).not.to.be.an('object');
        expect(cs).not.to.haveOwnProperty('lines');
        if (cs.type === 'new') {
          expect(cs).not.to.haveOwnProperty('revisions');
          newCnt += 1;
        } else {
          expect(cs).to.haveOwnProperty('revisions');
          expect(cs.revisions).to.have.length.greaterThan(0);
          editCnt += 1;
        }
      }, (err) => {
        expect(newCnt).to.equal(6);
        done(err);
      });
    });

    it('should have number of "new" changesets match media cnt');

    it('flags changesets as processed', function () {
      return db(tables.CHANGESETS).count({ processed: true }).then((cnt) => {
        expect(cnt).to.be.greaterThan(processedCnt);
      });
    });

    xit('deletes extraneous changesets', function () {
      return db(tables.CHANGESETS).count().then((cnt) => {
        expect(cnt).to.be.lessThan(changesetCnt);
      });
    });

    it('turns on backup flag for updated media', function () {
      expect(toBackupCnt).to.equal(0);
      return db(tables.MEDIA).count({ toBackup: true }).then((cnt) => {
        expect(cnt).to.be.greaterThan(0);
      });
    });
  });

  it('can handle multiple rounds');

  it('includes media creations');

  it('can handle error');

  it('can handle empty revisions');
});
