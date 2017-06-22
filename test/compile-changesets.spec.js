/* eslint-env mocha */
import { expect } from 'chai';
import aggregateActvity from '../lib/compile-changests';
import TestDB from './utils/db';
import populate from './utils/populate-db';

let db;
let populator;
let changesetCnt = 0;
let revisionCnt = 0;
let lineCnt = 0;
let mediaCnt = 0;

describe('compile-changesets.js', function () {
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
      populator = populate(db);
      return populator.loadLines()
        .then((cnt) => { lineCnt = cnt; })
        .then(populator.loadChangesets)
        .then((cnt) => { changesetCnt = cnt; })
        .then(populator.loadMedia)
        .then((cnt) => { mediaCnt = cnt; })
        .then(populator.loadRevisions)
        .then((cnt) => { revisionCnt = cnt; });
    });
  });

  after(function () {
    debugger;
    return TestDB.close();
  });

  describe.only('aggregateActvity', function () {
    let actualRevisionCnt = 0;
    let actualLineAddCnt = 0;
    before(function () {
      debugger;
      return aggregateActvity(db);
    });

    it('has no changesets without updates or creates', function (done) {
      db.collection('changesets').find().forEach((cs) => {
        expect(cs).to.haveOwnProperty('media');
        if (cs.type === 'new') {
          expect(cs).not.to.haveOwnProperty('lines');
          expect(cs).not.to.haveOwnProperty('revisions');
        } else {
          expect(cs).to.haveOwnProperty('lines');
          expect(cs).to.haveOwnProperty('revisions');
          actualRevisionCnt += cs.revisions.length;
          actualLineAddCnt += cs.lines.length;

          const totalModifications = cs.lines.length + cs.revisions.length;
          expect(totalModifications).to.be.greaterThan(0);
        }
      }, (err) => {
        expect(actualRevisionCnt).to.equal(revisionCnt);
        expect(actualLineAddCnt).to.equal(lineCnt);
        done(err);
      });
    });
  });

  it('has all original revisions within changets');

  it('incluces lyric adds in changeset');

  it('deletes extraneous changesets');

  it('includes media creations');

  it('clears compiled revisions', function () {

  });

  it('does not include incomplete revisions');
});
