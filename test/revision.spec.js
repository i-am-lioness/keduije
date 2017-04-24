/* eslint-env mocha */
import { expect } from 'chai';
import Revision, { states } from '../lib/revision';

const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

const DB_URL = process.env.TEST_DB_URL;

const testUser = {
  username: 'test',
  displayName: 'Test',
  photo: 'https://cdn3.iconfinder.com/data/icons/pretty-office-part-10-shadow-style/128/Test-paper.png',
};

const changesetID = '58fa130609ef9a7c03067d7a';
const mediaID = '58e745d22f1435db632f81fa';

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

let db;

describe('revision.js', () => {
  before(function () {
    return MongoClient.connect(DB_URL).then(function (database) {
      db = database;
    }).then(() => db.collection('users').insertOne(testUser));
  });

  after(function (done) {
    db.collections().then(function (collections) {
      const deletions = [];
      collections.forEach((c) => {
        if (!c.collectionName.startsWith('system.')) {
          console.log(`deleting ${c.collectionName}`);
          deletions.push(db.dropCollection(c.collectionName));
        }
      });

      Promise.all(deletions).then(() => db.close).then(() => { done(); }).catch(done);
    });
  });

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
    return r.execute('lines', req).then((line) => {
      expect(line.text).to.equal(lyricChanges.text);
    }).then(() => {
      throw new Error('Should have thrown an ObjectNotFoundError');
    })
    .catch((err) => {
      expect(err.name).to.equal('ObjectNotFoundError');
    });
  });

  it('edits a line', function () {
    const newLine = {
      text: 'never forget where i come from na from ghetto',
      endTime: 37,
      startTime: 34,
    };
    newLine.creator = testUser._id;
    newLine.media = mediaID;
    newLine.changeset = changesetID;
    newLine.version = 1;
    newLine.deleted = false;
    newLine.heading = null;

    const changes = { text: 'beautiful baby' };

    return db.collection('lines').insertOne(newLine)
      .then(() => {
        const req = updateLyric(newLine, changes);
        const r = new Revision(db);
        return r.execute('lines', req).then(line => line);
      }).then((line) => {
        expect(line.text).to.equal(changes.text);
      })
      .catch((err) => {
        throw err;
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
        return r.execute('lines', req).then(line => line);
      }).then((line) => {
        expect(line.text).to.equal(changes.text);
      })
      .then(() => {
        const req = updateLyric(newLine, changes2);
        const r = new Revision(db);
        return r.execute('lines', req)
          .then(() => {
            throw new Error('should have thrown error');
          }).catch(err => err);
      })
      .then((err) => {
        expect(err.name).to.equal('StaleVersionError');
      });
  });

  it('can recover from failed revision', function () {
    const newLine = {
      text: 'you will always be by my side',
      endTime: 69,
      startTime: 76,
    };
    newLine.creator = testUser._id;
    newLine.media = mediaID;
    newLine.changeset = changesetID;
    newLine.version = 1;
    newLine.deleted = false;
    newLine.heading = null;

    const changes = { text: 'i used to be so happy but without you here i feel so low' };
    const changes2 = { text: 'cuz once upon a time you were my everything' };
    let revisionData;

    return db.collection('lines').insertOne(newLine)
      .then(() => {
        const req = updateLyric(newLine, changes);
        const r = new Revision(db);
        return r.execute('lines', req).then(line => line);
      }).then((line) => {
        expect(line.text).to.equal(changes.text);
      })
      .then(() => {
        const req = updateLyric(newLine, changes2);
        const r = new Revision(db);
        return r.execute('lines', req)
          .then(() => {
            throw new Error('should have thrown error');
          }).catch(err => err);
      })
      .then((err) => {
        expect(err.name).to.equal('StaleVersionError');
        revisionData = err.revision;
        revisionData.original.version = 3;
        revisionData.state = states.PENDING;
        const r = new Revision(db);
        return r.processRevision(revisionData);
      })
      .then(() => {
        expect(revisionData.state).to.equal(states.DONE);
      });
  });
});
