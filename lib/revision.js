import { ObjectId } from 'mongodb';
import { tables, states, revisionTypes } from './constants';

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

  function saveRevision(err) {
    return db(tables.REVISIONS).save(revision).then(() => {
      // remembering to throw the original error
      // to do: consider throwing elswhere
      if (err) {
        throw err;
      }
    });
  }

  function clearRevision() {
    const q = { _id: revision._id };
    return db(tables.REVISIONS).deleteOne(q).then(() => revision);
  }

  function logRevision() {
    delete revision.req;

    const q = { _id: revision.changeset };
    const updateDoc = {
      $addToSet: { revisions: revision },
    };
    return db(tables.CHANGESETS).updateOne(q, updateDoc).then((result) => {
      revision.state = states.LOGGED;
      return saveRevision();
    }).then((clearRevision));
  }

  function finishRevision() {
    return db(revision.collectionName).updateOne(
      { _id: revision.for, pendingRevisions: revision._id },
      { $pull: { pendingRevisions: revision._id } }
    ).then((result) => {
      revision.state = 'done';
      return saveRevision();
    }).then(logRevision);
  }

  function commitRevision() {
    revision.state = 'applied';
    return db(tables.REVISIONS).save(revision).then(finishRevision);
  }

  function getVersionNumber() {
    return db(revision.collectionName).findOneAndUpdate(
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
    return db(tables.LINES).insertOne(revision.newLine)
      .then((result) => {
        if (responseCB) {
          responseCB({ result, revision });
        }

        revision.state = states.DONE;
        return saveRevision();
      }).then(logRevision);
  }

  function applyChange(queryObj, updateObj, versionNumber) {
    revision.newValues.version = versionNumber;
    return db(revision.collectionName).findOneAndUpdate(
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
    const data = revision.data;

    if (revision.type === revisionTypes.LINE_ADD) {
      // to do: add more descriptive error message
      const newLine = data;
      newLine.media = revision.media;
      newLine.changeset = revision.changeset;
      newLine.version = 1;
      newLine.deleted = false;
      newLine.heading = null;
      revision.newLine = data;

      return applyAdd().catch(saveRevision);
    }

    // else
    revision.newValues = data.changes;
    revision.original = data.original;
    if (revision.type === revisionTypes.INFO_EDIT) {
      revision.collectionName = tables.MEDIA;
      revision.for = revision.media;
    } else {
      revision.collectionName = tables.LINES;
      revision.for = ObjectId(revision.original._id);
    }

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

  function onUpdateRequest(changesetID, mediaID, type, data) {
    return new Promise((resolve, reject) => {
      responseCB = resolve;

      revision = {
        state: states.PENDING,
        type,
        data,
        lastModified: new Date(), // to do: ensure updated with each save
        changeset: ObjectId(changesetID),
        media: ObjectId(mediaID),
      };

      return db(tables.REVISIONS)
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
        return Promise.reject(new Error('unrecognized state'));
    }
  }

  this.execute = onUpdateRequest;
  this.recover = recover;
}

export { Revision as default, ObjectNotFoundError, states, revisionTypes };
