/* eslint-env mocha */
import { expect } from 'chai';
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
      db(tables.CHANGESETS).find().forEach((cs) => {
        expect(cs).to.haveOwnProperty('media');
        expect(cs).not.to.haveOwnProperty('lines');
        if (cs.type === 'new') {
          expect(cs).not.to.haveOwnProperty('revisions');
        } else {
          expect(cs).to.haveOwnProperty('revisions');
          expect(cs.revisions).to.have.length.greaterThan(0);
        }
      }, (err) => {
        done(err);
      });
    });

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
