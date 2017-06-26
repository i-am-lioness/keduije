// const ObjectId = require('mongodb').ObjectId;
import { ObjectId } from 'mongodb';

// exctract to global constants?
const states = {
  PENDING: 'pending',
  APPLIED: 'applied',
  DONE: 'done',
  CANCELED: 'canceled',
  LOGGED: 'logged',
};

const revisionTypes = {
  LINE_ADD: 'lineAdd',
  LINE_EDIT: 'lineEdit',
  INFO_EDIT: 'infoEdit',
};

// Todo: complete
const sanitize = text => text;
function validate(line) {
  return new Promise((resolve, reject) => {
    const newLine = {};
    newLine.startTime = parseInt(line.startTime, 10);
    newLine.endTime = parseInt(line.endTime, 10);
    newLine.text = sanitize(line.text);
    // no client generated object being stored directly in server
    resolve(newLine);
  });
}

class ObjectNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ObjectNotFoundError';
  }
}

class StaleVersionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StaleVersionError';
  }
}

function Revision(db) {
  let responseCB = null;
  let revision = null;

  let debugCB = null;
  function getDebugInfo() {
    return new Promise((resolve, reject) => {
      debugCB = resolve;
    });
  }

  function saveRevision(err) {
    return db.collection('revisions').save(revision).then(() => {
      // remembering to throw the original error
      // to do: consider throwing elswhere
      if (err) {
        throw err;
      }
    });
  }

  function clearRevision() {
    const q = { _id: revision._id };
    return db.collection('revisions').deleteOne(q).then(() => {
      if (debugCB) {
        debugCB(revision);
      }
      return revision;
    });
  }

  function logRevision() {
    delete revision.req;

    const q = { _id: revision.changeset };
    const updateDoc = {
      $addToSet: { revisions: revision },
    };
    return db.collection('changesets').updateOne(q, updateDoc).then((result) => {
      revision.state = states.LOGGED;
      return saveRevision();
    }).then(clearRevision);
  }

  function finishRevision() {
    return db.collection(revision.collectionName).updateOne(
      { _id: revision.for, pendingRevisions: revision._id },
      { $pull: { pendingRevisions: revision._id } }
    ).then((result) => {
      revision.state = 'done';
      return saveRevision();
    }).then(logRevision);
  }

  function commitRevision() {
    revision.state = 'applied';
    return db.collection('revisions').save(revision).then(finishRevision);
  }

  function getVersionNumber() {
    return db.collection(revision.collectionName).findOneAndUpdate(
        { _id: revision.for },
        { $inc: { version: 1 } },
        { returnOriginal: false }
      ).then((result) => {
        if (result && result.value) {
          const versionNumber = result.value.version;

          if ((versionNumber - 1) !== parseInt(revision.original.version, 10)) {
            revision.state = 'canceled';
            throw new StaleVersionError(`You are editing a stale version of this object. Version ${
              versionNumber} already edited.`);
          }

          return versionNumber;
        }
        revision.state = states.CANCELED;
        throw new ObjectNotFoundError(`Original item (_id: ${revision.for}) not found in ${revision.collectionName}`);
      });
  }

  function applyAdd() {
    return db.collection('lines').insertOne(revision.newLine)
      .then((result) => {
        if (responseCB) {
          responseCB(result);
        }

        revision.state = states.DONE;
        return saveRevision();
      }).then(logRevision);
  }

  function applyChange(queryObj, updateObj, versionNumber) {
    revision.newValues.version = versionNumber;
    return db.collection(revision.collectionName).findOneAndUpdate(
      queryObj,
      updateObj,
      { returnOriginal: false }
    ).then((result) => {
      if (responseCB) {
        responseCB(result.value);
      }

      return commitRevision();
    });
  }

  function processRevision() {
    const req = revision.req;

    if (revision.type === revisionTypes.LINE_ADD) {
      // to do: add more descriptive error message
      return validate(req.body)
        .then((newLine) => {
          newLine.creator = req.user._id;
          newLine.media = ObjectId(req.params.mediaID);
          newLine.changeset = ObjectId(req.body.changesetID);
          newLine.version = 1;
          newLine.deleted = false;
          newLine.heading = null;
          revision.newLine = newLine;
        })
        .then(applyAdd)
        .catch(saveRevision);
    }

    // else
    revision.for = ObjectId(req.params.forID);
    revision.newValues = req.body.changes;
    revision.original = req.body.original;
    revision.collectionName = (revision.type === revisionTypes.INFO_EDIT) ? 'media' : 'lines';

    return getVersionNumber()
      .then((versionNumber) => {
        const queryObj = { _id: revision.for, pendingRevisions: { $ne: revision._id } };
        const updateObj = {
          $push: { pendingRevisions: revision._id },
          $currentDate: { lastModified: true },
          $set: revision.newValues,
        };

        return applyChange(queryObj, updateObj, versionNumber);
      })
      .catch(saveRevision);
  }

  function onUpdateRequest(type, req) {
    return new Promise((resolve, reject) => {
      responseCB = resolve;

      revision = {
        state: states.PENDING,
        req,
        type,
        lastModified: new Date(),
        changeset: ObjectId(req.body.changesetID),
        media: ObjectId(req.body.mediaID), // for easy querying of all song edits
        user: req.user._id,
      };

      return db.collection('revisions')
        .insertOne(revision)
        .then(processRevision)
        .catch((err) => {
          console.error(err);
          err.revision = revision;
          reject(err);
        });
    });
  }

  function recover(r) {
    revision = r;

    switch (r.state) {
      case states.PENDING:
        return processRevision();
      case states.APPLIED:
        return finishRevision();
      case states.DONE:
        return logRevision();
      case states.LOGGED:
      case states.CANCELED:
        return clearRevision();
      default:
        return Promise.reject('unrecognized state');
    }
  }

  this.execute = onUpdateRequest;
  this.recover = recover;
  this.getDebugInfo = getDebugInfo;
}

export { Revision as default, ObjectNotFoundError, states, revisionTypes };
