/* eslint-env mocha */
import { expect } from 'chai';
import backupMedia from '../lib/backup';
import TestDB from './utils/db';
import populate from './utils/populate-db';

let db;
let populator;
let lineCnt = 0;
let mediaCnt = 0;

describe('backup.js', function () {
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
      populator = populate(db);
      return populator.loadLines()
        .then((cnt) => { lineCnt = cnt; })
        .then(populator.loadMedia)
        .then((cnt) => { mediaCnt = cnt; });
    });
  });

  after(function () {
    debugger;
    return TestDB.close();
  });

  describe('backupMedia', function () {
    let actualLineAddCnt = 0;
    before(function () {
      debugger;
      return backupMedia(db);
    });

    it('backs up all media', function () {
      return db.collection('snapshots').count().then((cnt) => {
        expect(cnt).to.equal(mediaCnt);
      });
    });

    it('backsup all lines', function (done) {
      db.collection('snapshots').find().forEach((ss) => {
        expect(ss).to.haveOwnProperty('info');
        expect(ss).to.haveOwnProperty('lines');
        expect(ss.lines).to.be.an('Array');
        actualLineAddCnt += ss.lines.length;
      }, (err) => {
        expect(actualLineAddCnt).to.equal(lineCnt);
        done(err);
      });
    });
  });

  it('only backs up media that has changed since last backup');

  it('it stores no more than 5 backups for a given media');
});
