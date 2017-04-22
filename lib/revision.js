const ObjectId = require('mongodb').ObjectId;

module.exports = (db) => {
  let responseCB = null;
  let revision = null;

  function saveRevision(err) {
    return db.collection('revisions').save(revision).then(() => {
      // remembering to throw the original error
      // to do: consider throwing elswhere
      if (err) {
        throw err;
      }
    });
  }

  function finishRevision() {
    return db.collection(revision.collectionName).updateOne(
      { _id: revision.for, pendingRevisions: revision._id },
      { $pull: { pendingRevisions: revision._id } }
    ).then((result) => {
      revision.state = 'done';
      return saveRevision();
    });
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
        const versionNumber = result.value.version;

        if ((versionNumber - 1) !== parseInt(revision.original.version, 10)) {
          revision.state = 'canceled';
          throw new Error(`You are editing a stale version of this line. Version ${
            versionNumber} already edited.`);
        }

        return versionNumber;
      });
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

  function processRevision(r) {
    revision = revision || r;

    const queryObj = { _id: revision.for, pendingRevisions: { $ne: revision._id } };
    const updateObj = {
      $push: { pendingRevisions: revision._id },
      $currentDate: { lastModified: true },
      $set: revision.newValues,
    };

    return getVersionNumber()
      .then(applyChange.bind(this, queryObj, updateObj))
      .catch(saveRevision);
  }

  function onUpdateRequest(collectionName, req) {
    return new Promise((resolve, reject) => {
      responseCB = resolve;

      revision = {
        state: 'pending',
        collectionName,
        user: req.user._id,
        for: ObjectId(req.params.forID),
        lastModified: new Date(),
        newValues: req.body.changes,
        original: req.body.original,
        changeset: ObjectId(req.body.changesetID),
        media: ObjectId(req.body.mediaID), // for easy querying of all song edits
      };

      return db.collection('revisions').insertOne(revision).then(processRevision);
    });
  }

  this.execute = onUpdateRequest;
  this.processRevision = processRevision;
  this.finishRevision = finishRevision;
};
