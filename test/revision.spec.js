/* eslint-env mocha */
import { expect } from 'chai';
import Revision, { states, revisionTypes } from '../lib/revision';
import TestDB from './utils/db';
import { tables } from '../lib/constants';

const ObjectId = require('mongodb').ObjectId;

/* Test Data */
const changesetID = '58fa130609ef9a7c03067d7a';
const mediaID = '58e745d22f1435db632f81fa';
const userID = '5900a0ff6b5df803808e7be9';

const testUser = {
  _id: ObjectId(userID),
  username: 'test',
  displayName: 'Test',
  photo: 'https://cdn3.iconfinder.com/data/icons/pretty-office-part-10-shadow-style/128/Test-paper.png',
};

const changesetA = {
  _id: ObjectId(changesetID),
  user: ObjectId(userID),
  media: ObjectId(mediaID),
};

const mediaA = {
  _id: ObjectId(mediaID),
  title: 'So Far So Good',
  artist: 'Phyno',
  src: 'love.org',
  version: 1,
};

function revisionData(original, changes) {
  return { original, changes };
}

/* Test suite */
let db;

describe('revision.js', () => {
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
    })
    .then(() => db(tables.USERS).insertOne(testUser))
    .then(() => db(tables.CHANGESETS).insertOne(changesetA)
    .then(() => db(tables.MEDIA).insertOne(mediaA)));
  });

  after(function () {
    debugger;
    return TestDB.close();
  });

  describe('Revision', function () {
    const newLyric = {
      text: 'never forget where i come from na from ghetto',
      endTime: 37,
      startTime: 34,
      creator: testUser._id,
    };

    let addResult;
    let revisionDoc;

    before(function () {
      const lineAdd = new Revision(db);
      return lineAdd.execute(changesetID, mediaID, revisionTypes.LINE_ADD, newLyric)
        .then((res) => {
          addResult = res.result;
          newLyric._id = res.result.insertedId;
          revisionDoc = res.revision;
        });
    });

    // ✓ GOOD
    it('adds a line', function () {
      expect(addResult.insertedCount).to.equal(1);
      const doc = addResult.ops[0];
      expect(doc.text).to.equal(newLyric.text);
      expect(doc.endTime).to.equal(newLyric.endTime);
      expect(doc.startTime).to.equal(newLyric.startTime);
      expect(doc.version).to.equal(1);
      expect(doc.deleted).to.be.false;
      expect(doc.heading).to.be.null;
      expect(doc.changeset.toString()).to.equal(changesetID);
      expect(doc.creator.toString()).to.equal(userID);
      expect(doc.media.toString()).to.equal(mediaID);
    });

    // ✓ GOOD
    it('edits a line', function () {
      const changes = { text: 'beautiful baby' };
      const data = revisionData(newLyric, changes);
      const r = new Revision(db);
      return r.execute(changesetID, mediaID, revisionTypes.LINE_EDIT, data)
        .then((line) => {
          expect(line.text).to.equal(changes.text);
        });
    });

    // ✓ GOOD
    it('edits media info', function () {
      const changes = { src: 'trust.net' };
      const data = revisionData(mediaA, changes);
      const r = new Revision(db);
      return r.execute(changesetID, mediaID, revisionTypes.INFO_EDIT, data)
        .then((media) => {
          expect(media.src).to.equal(changes.src);
        });
    });

    // ✓ GOOD
    it('self-adds to the changeset', function () {
      return db(tables.CHANGESETS).findOne({ _id: changesetA._id })
        .then((doc) => {
          expect(doc).to.haveOwnProperty('revisions');
          expect(doc.revisions).to.be.an('array');
          expect(doc.revisions).to.have.length.at.least(1);
          expect(doc.revisions[0]._id.toString()).to.equal(revisionDoc._id.toString());
        });
    });

    // ✓ GOOD
    it('self deletes', function () {
      return db(tables.REVISIONS).count({ _id: revisionDoc._id })
        .then((cnt) => {
          expect(cnt).to.equal(0);
        });
    });
  });

  describe('on failure', function () {
    // ✓ GOOD
    it('throws ObjectNotFoundError if trying to edit a line that doesnt exist', function () {
      const oldLyric = {
        _id: '58e7e85808091bfe6d06a498',
        text: 'never forget where i come from na from ghetto',
        endTime: 37,
        startTime: 34,
      };

      const lyricChanges = {
        text: "you know it's true",
      };

      const data = revisionData(oldLyric, lyricChanges);
      const r = new Revision(db);
      return r.execute(changesetID, mediaID, revisionTypes.LINE_EDIT, data)
        .catch(err => err)
        .then((err) => {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.name).to.equal('ObjectNotFoundError');
        });
    });

    describe('when editing stale line', function () {
      let changeError;

      const newLine = {
        text: 'you are everything. and everything is you',
        endTime: 69,
        startTime: 76,
      };
      const changes = { text: 'i am never sad and blue' };
      const changes2 = { text: 'i will never forget you' };

      before(function () {
        newLine.creator = testUser._id;
        newLine.media = mediaID;
        newLine.changeset = changesetID;
        newLine.version = 1;
        newLine.deleted = false;
        newLine.heading = null;

        return db(tables.LINES).insertOne(newLine)
          .then(() => {
            const data = revisionData(newLine, changes);
            const r = new Revision(db);
            return r.execute(changesetID, mediaID, revisionTypes.LINE_EDIT, data);
          })
          .then((line) => {
            expect(line.text).to.equal(changes.text);

            const data = revisionData(newLine, changes2);
            const r = new Revision(db);
            return r.execute(changesetID, mediaID, revisionTypes.LINE_EDIT, data);
          })
          .catch((err) => {
            changeError = err;
          });
      });

      // ✓ GOOD
      it('throws a StaleVersionError', function () {
        expect(changeError).to.be.an.instanceOf(Error);
        expect(changeError.name).to.equal('StaleVersionError');
      });

      // ✓ GOOD
      it('can still recover from failed attempt', function () {
        const rev = changeError.revision;
        rev.original.version = 3;
        rev.state = states.PENDING;
        const r = new Revision(db);
        return r.recover(rev)
          .then(() => {
            expect(rev.state).not.to.equal(states.PENDING);
            return db(tables.LINES).findOne({ _id: newLine._id });
          })
          .then((line) => {
            expect(line.text).to.equal(changes2.text);
          });
      });
    }); // describe('when editing stale line'
  });

  describe('recovery', function () {
    const revision = {
      type: revisionTypes.LINE_ADD,
      lastModified: new Date(),
      changeset: ObjectId(changesetID),
      collectionName: 'lines', //to do: force fail by leaving this property out
    };

    let loggedRevisionCnt;

    beforeEach(function () {
      const q = { _id: ObjectId(changesetID) };
      return db(tables.CHANGESETS).findOne(q).then((doc) => {
        loggedRevisionCnt = doc.revisions ? doc.revisions.length : 0;
        console.log(`loggedRevisionCnt: ${loggedRevisionCnt}`);
      });
    });

    // ✓ GOOD
    it('can recover pending revision', function () {
      const data = {
        text: 'a fulum gi nanya',
        startTime: 56,
        endTime: 60,
      };
      const pendingRevision = Object.assign({
        state: states.PENDING,
        data,
      }, revision);

      const r = new Revision(db);
      return r.recover(pendingRevision)
        .then((revData) => {
          expect(revData.state).to.equal(states.LOGGED);
          const q = { _id: ObjectId(changesetID), 'revisions._id': revData._id };
          return db(tables.CHANGESETS).findOne(q);
        }).then((doc) => {
          expect(doc.revisions.length).to.equal(loggedRevisionCnt + 1);
        });
    });

    // ✓ GOOD
    it('can recover applied revision', function () {
      const r = new Revision(db);
      const appliedRevision = Object.assign({ state: states.APPLIED }, revision);
      return r.recover(appliedRevision)
        .then((revData) => {
          expect(revData.state).to.equal(states.LOGGED);
          const q = { _id: ObjectId(changesetID), 'revisions._id': revData._id };
          return db(tables.CHANGESETS).findOne(q);
        }).then((doc) => {
          expect(doc.revisions.length).to.equal(loggedRevisionCnt + 1);
        });
    });

    // ✓ GOOD
    it('can recover done revision', function () {
      const doneRevision = Object.assign({ state: states.DONE }, revision);
      const r = new Revision(db);
      return r.recover(doneRevision)
        .then((revData) => {
          expect(revData.state).to.equal(states.LOGGED);
          const q = { _id: ObjectId(changesetID) };
          return db(tables.CHANGESETS).findOne(q);
        }).then((doc) => {
          expect(doc.revisions.length).to.equal(loggedRevisionCnt + 1);
        });
    });

    // ✓ GOOD
    it('can recover logged revision', function () {
      const loggedRevision = Object.assign({ state: states.LOGGED }, revision);
      return db(tables.REVISIONS).insertOne(loggedRevision)
        .then(() => db(tables.REVISIONS).count({ _id: loggedRevision._id }))
        .then((cnt) => {
          expect(cnt).to.equal(1);
          const r = new Revision(db);
          return r.recover(loggedRevision);
        })
        .then(() => db(tables.REVISIONS).count({ _id: loggedRevision._id }))
        .then((cnt) => {
          expect(cnt).to.equal(0);
        });
    });

    // ✓ GOOD
    it('can handle invalid revision state', function () {
      const invalidRevision = Object.assign({ state: 'howdy' }, revision);
      const r = new Revision(db);
      return r.recover(invalidRevision).catch(err => err).then((error) => {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.include('unrecognized state');
      });
    });
  });

  it('can edit media info');

  it('does not change state to logged if not logged');
  it('does not save http request in changeset');
  it('should be cleared from pendingRevisions');

  it('dones not save newValues for times that did not change');

  it('keeps lastModified up to date');
});
