/* eslint-env mocha */
import { expect } from 'chai';
import Revision, { states, revisionTypes } from '../lib/revision';
import TestDB from './utils/db';

const ObjectId = require('mongodb').ObjectId;

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

function updateLyric(original, changes) {
  const postData = {
    original,
    changes,
    mediaID,
    changesetID,
  };

  const request = {
    user: testUser,
    params: { forID: original._id },
    body: postData,
  };

  return request;
}

function addLyric(newLyric) {
  newLyric.mediaID = mediaID;
  newLyric.changesetID = changesetID;
  newLyric.version = 1;

  const request = {
    user: testUser,
    params: { mediaID },
    body: newLyric,
  };

  return request;
}

let db;

describe('revision.js', () => {
  before(function () {
    return TestDB.open().then(function (database) {
      db = database;
    }).then(() => db.collection('users').insertOne(testUser))
    .then(() => db.collection('changesets').insertOne(changesetA));
  });

  after(function () {
    debugger;
    return TestDB.close();
  });

  describe('basic funcitonality- ', function () {
    const newLyric = {
      text: 'never forget where i come from na from ghetto',
      endTime: 37,
      startTime: 34,
    };

    const changes = { text: 'beautiful baby' };

    let addResult = null;
    let lineAdd;
    let revisionDoc;

    before(function () {
      const req = addLyric(newLyric);
      lineAdd = new Revision(db);
      return lineAdd.execute(revisionTypes.LINE_ADD, req).then((result) => {
        addResult = result;
        newLyric._id = result.insertedId;
        return lineAdd.getDebugInfo();
      }).then((r) => {
        revisionDoc = r;
      });
    });

    it('adds a line', function () {
      expect(addResult.insertedCount).to.equal(1);
      const doc = addResult.ops[0];
      expect(doc.text).to.equal(newLyric.text);
      expect(doc.endTime).to.equal(newLyric.endTime);
      expect(doc.startTime).to.equal(newLyric.startTime);
      expect(doc.version).to.equal(1);
      expect(doc.deleted).to.be.false;
      expect(doc.heading).to.be.null;
      /*
      expect(doc.changeset).to.equal(newLyric.creator);
      expect(doc.creator).to.equal(newLyric.creator);
      expect(doc.media).to.equal(newLyric.creator);
      */
    });

    it('edits a line', function () {
      const req = updateLyric(newLyric, changes);
      const r = new Revision(db);
      return r.execute(revisionTypes.LINE_EDIT, req)
        .then((line) => {
          expect(line.text).to.equal(changes.text);
        });
    });

    it('self-adds to the changeset', function () {
      return db.collection('changesets').findOne({ _id: changesetA._id })
      .then((doc) => {
        debugger;
        expect(doc).to.haveOwnProperty('revisions');
        expect(doc.revisions).to.be.an('array');
        expect(doc.revisions).to.have.length.at.least(1);
        expect(doc.revisions[0]._id.toString()).to.equal(revisionDoc._id.toString());
      });
    });

    it('self deletes', function () {
      return db.collection('revisions').count({ _id: revisionDoc._id })
        .then((cnt) => {
          expect(cnt).to.equal(0);
        });
    });
  });

  describe('error handling', function () {
    it('throws error, if trying to edit a line that doesnt exist', function () {
      const oldLyric = {
        _id: '58e7e85808091bfe6d06a498',
        text: 'never forget where i come from na from ghetto',
        endTime: 37,
        startTime: 34,
      };

      const lyricChanges = {
        text: "you know it's true",
      };

      const req = updateLyric(oldLyric, lyricChanges);
      const r = new Revision(db);
      return r.execute(revisionTypes.LINE_EDIT, req).then((line) => {
        expect(line.text).to.equal(lyricChanges.text);
      }).then(() => {
        throw new Error('Should have thrown an ObjectNotFoundError');
      })
      .catch((err) => {
        expect(err.name).to.equal('ObjectNotFoundError');
      });
    });

    it('fails when editing stale line', function () {
      const newLine = {
        text: 'you are everything. and everything is you',
        endTime: 69,
        startTime: 76,
      };
      newLine.creator = testUser._id;
      newLine.media = mediaID;
      newLine.changeset = changesetID;
      newLine.version = 1;
      newLine.deleted = false;
      newLine.heading = null;

      const changes = { text: 'i am never sad and blue' };
      const changes2 = { text: 'i will never forget you' };

      return db.collection('lines').insertOne(newLine)
        .then(() => {
          const req = updateLyric(newLine, changes);
          const r = new Revision(db);
          return r.execute(revisionTypes.LINE_EDIT, req).then(line => line);
        }).then((line) => {
          expect(line.text).to.equal(changes.text);
        })
        .then(() => {
          const req = updateLyric(newLine, changes2);
          const r = new Revision(db);
          return r.execute(revisionTypes.LINE_EDIT, req)
            .then(() => {
              throw new Error('should have thrown error');
            }).catch(err => err);
        })
        .then((err) => {
          expect(err.name).to.equal('StaleVersionError');
        });
    });
  });

  describe('recovery - ', function () {
    const newLyric = {
      text: 'you will always be by my side',
      endTime: 69,
      startTime: 76,
    };
    const changes = { text: 'i used to be so happy but without you here i feel so low' };
    const changes2 = { text: 'cuz once upon a time you were my everything' };

    let addResult = null;
    let lineAdd;
    let changeResult1;
    let changeError;

    before(function () {
      let req = addLyric(newLyric);
      lineAdd = new Revision(db);
      return lineAdd.execute(revisionTypes.LINE_ADD, req).then((result) => {
        addResult = result;
        newLyric._id = result.insertedId;
        newLyric.version = 1;
        req = updateLyric(newLyric, changes);
        const r = new Revision(db);
        return r.execute(revisionTypes.LINE_EDIT, req);
      }).then((line) => {
        changeResult1 = line;
        req = updateLyric(newLyric, changes2);
        const r = new Revision(db);
        return r.execute(revisionTypes.LINE_EDIT, req)
        .then(() => {
          debugger;
          throw new Error('should have thrown error');
        }).catch((err) => {
          debugger;
          changeError = err;
        });
      });
    });

    it('added a line', function () {
      expect(addResult.insertedCount).to.equal(1);
      const doc = addResult.ops[0];
      expect(doc.text).to.equal(newLyric.text);
      expect(doc.endTime).to.equal(newLyric.endTime);
      expect(doc.startTime).to.equal(newLyric.startTime);
      expect(doc.version).to.equal(1);
      expect(doc.deleted).to.be.false;
      expect(doc.heading).to.be.null;
    });

    it('successfully edits next version of line', function () {
      expect(changeResult1.text).to.equal(changes.text);
    });

    it('should throw StaleVersionError', function () {
      expect(changeError.name).to.equal('StaleVersionError');
    });

    it('can recover from failed revision', function () {
      const revisionData = changeError.revision;
      revisionData.original.version = 3;
      revisionData.state = states.PENDING;
      const r = new Revision(db);
      return r.recover(revisionData)
        .then(() => {
          expect(revisionData.state).not.to.equal(states.PENDING);
        });
    });
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
      return db.collection('changesets').findOne(q).then((doc) => {
        loggedRevisionCnt = doc.revisions ? doc.revisions.length : 0;
        console.log(`loggedRevisionCnt: ${loggedRevisionCnt}`);
      });
    });

    it('can recover applied revision', function () {
      const r = new Revision(db);
      const appliedRevision = Object.assign({ state: states.APPLIED }, revision);
      return r.recover(appliedRevision)
        .then((revData) => {
          expect(revData.state).to.equal(states.LOGGED);
          const q = { _id: ObjectId(changesetID), 'revisions._id': revData._id };
          return db.collection('changesets').findOne(q);
        }).then((doc) => {
          expect(doc.revisions.length).to.equal(loggedRevisionCnt + 1);
        });
    });

    it('can recover done revision', function () {
      const doneRevision = Object.assign({ state: states.DONE }, revision);
      const r = new Revision(db);
      return r.recover(doneRevision)
        .then((revData) => {
          expect(revData.state).to.equal(states.LOGGED);
          const q = { _id: ObjectId(changesetID) };
          return db.collection('changesets').findOne(q);
        }).then((doc) => {
          expect(doc.revisions.length).to.equal(loggedRevisionCnt + 1);
        });
    });

    it('can recover logged revision', function () {
      const loggedRevision = Object.assign({ state: states.LOGGED }, revision);
      return db.collection('revisions').insertOne(loggedRevision)
        .then(() => db.collection('revisions').count({ _id: loggedRevision._id }))
        .then((cnt) => {
          expect(cnt).to.equal(1);
          const r = new Revision(db);
          return r.recover(loggedRevision);
        })
        .then(() => db.collection('revisions').count({ _id: loggedRevision._id }))
        .then((cnt) => {
          expect(cnt).to.equal(0);
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
