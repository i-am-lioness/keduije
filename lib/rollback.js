import { ObjectId } from 'mongodb';

// exctract to global constants?
const states = {
  PENDING: 'pending',
  INITIATED: 'initiated',
  APPLIED: 'applied',
  DONE: 'done',
  CANCELED: 'canceled',
};


function getMediaInfo(m) {
  // use constant list of fields, or "info field"
  return {
    artist: m.artist,
    title: m.title,
    img: m.img,
    // todo: consider setting lines as well
  };
}


function Rollback(db) {
  let rollback = null;

  function saveRollback(err) {
    return db.collection('revisions').save(rollback).then(() => {
      // remembering to throw the original error
      // to do: consider throwing elswhere
      if (err) {
        throw err;
      }
    });
  }

  function finishRollback() {
    return db.collection('media').updateOne(
      { _id: rollback.media, pendingRollbacks: rollback._id },
      { $pull: { pendingRollbacks: rollback._id } }
    ).then((result) => {
      rollback.state = 'done';
      return saveRollback();
    });
  }


  function commitRollback() {
    rollback.state = states.APPLIED;
    return db.collection('revisions').save(rollback).then(finishRollback);
  }

  function rollbackLines() {
    return db.collection('lines').insertMany(rollback.snapshot.lines).then(commitRollback);
  }

  function clearLines() {
    const queryObj = { media: rollback.media };

    return db.collection('lines').deleteMany(queryObj).then(rollbackLines);
  }

  function rollbackMetaData(ss) {
    rollback.snapshot = ss;
    rollback.media = ss.media;

    const queryObj = { _id: ss.media, pendingRollbacks: { $ne: rollback._id } };
    const updateObj = {
      $push: { pendingRollbacks: rollback._id },
      $currentDate: { lastModified: true },
      $set: getMediaInfo(ss),
    };

    return db.collection('media').findOneAndUpdate(queryObj, updateObj).then(() => {
      rollback.state = states.INITIATED;
      return saveRollback();
    }).then(clearLines);
  }

  function processRollback(r) {
    rollback = rollback || r;

    const queryObj = { _id: rollback.snapshot };

    return db.collection('snapshots').findOne(queryObj)
      .then(rollbackMetaData);
/*      .catch((reason) => {
        rollback.state = states.CANCELED;
        rollback.err = reason;
        saveRollback(reason);
      }); */
  }

  function onRollbackRequest(snapshotID, user) {
    rollback = {
      type: 'rollback',
      state: states.PENDING,
      user,
      snapshot: ObjectId(snapshotID),
    };

    return db.collection('changesets').insertOne(rollback).then(processRollback);
  }

  this.execute = onRollbackRequest;
  this.processRollback = processRollback;
  this.finishRollback = finishRollback;
}

export { Rollback as default, states };
