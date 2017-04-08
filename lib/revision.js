const ObjectId = require('mongodb').ObjectId;
const slugify = require('slugify');

module.exports = (db) => {
  let masterResolve = null;
  let masterReject = null;
  let responseCB = null;
  let revision = null;

  function logError(err) {
    masterReject(err);
  }

  function finishRevision() {
    db.collection(revision.target).updateOne(
      { _id: revision.forID, pendingRevisions: revision._id },
      { $pull: { pendingRevisions: revision._id } }
    ).then((result) => {
      revision.state = 'done';
      db.collection('revisions').save(revision).then(masterResolve);
    }).catch(logError);
  }


  function commitRevision() {
    revision.state = 'applied';
    db.collection('revisions').save(revision).then(() => {
      finishRevision();
    }).catch(logError);
  }

  function getVersionNumber() {
    return new Promise((resolve, reject) => {
      db.collection(revision.target).findAndModify(
        { _id: revision.forID },
        null,
        { $inc: { version: 1 } },
        { new: true }
      ).then((result) => {
        const versionNumber = result.value.version;
        if ((versionNumber - 1) === parseInt(revision.original.version, 10)) {
        // this revision is the next version, and will be applied
          resolve(versionNumber);
        } else {
          reject(`You are editing a stale version of this line. Version ${versionNumber} already edited.`);

          revision.state = 'canceled';
          db.collection('revisions').save(revision);
        }
      }).catch(reject);
    });
  }

  function applyChange(queryObj, updateObj, versionNumber) {
    revision.newValues.version = versionNumber;
    db.collection(revision.target).findAndModify(
      queryObj,
      null,
      updateObj,
      { new: true }
    ).then(
      (result) => {
        if (responseCB) {
          responseCB(result.value);
        }

        commitRevision();
      }
    ).catch(logError);
  }


  function processRevision(r) {
    return new Promise((resolve, reject) => {
      masterResolve = masterResolve || resolve;
      masterReject = masterReject || reject;
      revision = revision || r;

      const queryObj = { _id: revision.forID, pendingRevisions: { $ne: revision._id } };
      const updateObj = {
        $push: { pendingRevisions: revision._id },
        $currentDate: { lastModified: true },
        $set: revision.newValues,
      };

      if ((revision.target === 'media') && revision.newValues.title) {
        revision.newValues.slug = slugify(revision.newValues.title);
      }

      getVersionNumber()
        .then(applyChange.bind(this, queryObj, updateObj))
        .catch((error) => { logError(error); });
    });
  }

  function onUpdateRequest(target, req) {
    return new Promise((resolve, reject) => {
      responseCB = resolve;
      masterReject = reject;

      revision = {
        state: 'pending',
        target: target,
        user: req.user._id,
        forID: ObjectId(req.params.forID),
        lastModified: new Date(),
        newValues: req.body.changes,
        original: req.body.original,
        changeset: req.body.changeset,
        mediaID: req.body.mediaID, // for easy querying of all song edits
      };

      db.collection('revisions').insertOne(revision).then(processRevision).catch(logError);
    });
  }

  return {
    onUpdateRequest: onUpdateRequest,
    processRevision: processRevision,
    finishRevision: finishRevision,
  };
};
