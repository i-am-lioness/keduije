var ObjectId = require('mongodb').ObjectId;
var slugify = require('slugify');

module.exports = function(db){
  //todo: store revision object within closure

  var masterResolve = null;
  var masterReject = null;
  var responseCB = null;

  function logError(err){  
    masterReject(err);
  }

  function finishRevision(revision){
    db.collection(revision.target).updateOne(
      { _id: revision.forID, pendingRevisions: revision._id},
      {$pull: {pendingRevisions: revision._id}}
    ).then(function(result){
      revision.state="done";
      db.collection("revisions").save(revision).then(masterResolve);
    }).catch(logError);
  }


  function commitRevision(revision){
    revision.state="applied";
    db.collection("revisions").save(revision).then(function(){
      finishRevision(revision);
    }).catch(logError);
  }

  function getVersionNumber(revision) {
	return new Promise((resolve, reject) => {

		 db.collection(revision.target).findAndModify(
			 { _id: revision.forID },
			 null,
			 { $inc: { version: 1 } },
			 {new: true}
      ).then((result)=>{ 
          var versionNumber = result.value.version;
          if((versionNumber-1)==parseInt(revision.original.version)){
            //this revision is the next version, and will be applied
            resolve(versionNumber);
          }else{
            reject("You are editing a stale version of this line. Version "+ versionNumber + " already edited.");

            revision.state="canceled";
            db.collection("revisions").save(revision);
          }
        }).catch(reject);
      
    });
  }

  function applyChange(revision, queryObj, updateObj, versionNumber){
    updateObj.$set.version=versionNumber;
    db.collection(revision.target).findAndModify(
      queryObj,
      null,
      updateObj,
      {new: true}
    ).then(
      function(result){

        if(responseCB){
          responseCB(result.value);
        }

        commitRevision(revision)
      }
    ).catch(logError);
  }


  function processRevision(revision){
    return new Promise((resolve, reject) => {

      masterResolve = masterResolve || resolve;
      masterReject = masterReject || reject;

    var queryObj = { _id: revision.forID, pendingRevisions: { $ne: revision._id } };
    var updateObj = {
      $push: {pendingRevisions: revision._id},
      $currentDate: { lastModified: true },
      $set: revision.newValues
    };

    if((revision.target=="media") && revision.newValues.title)
      revision.newValues.slug=slugify(revision.newValues.title);

    getVersionNumber(revision)
      .then(applyChange.bind(this, revision, queryObj, updateObj))
      .catch((error)=>{ logError(error)});

    });

  }

  function onUpdateRequest(target, req){
    return new Promise((resolve, reject) => {

      responseCB = resolve;
      masterReject = reject;

    var revision = {
      state: "pending",
      target: target,
      user: req.user._id,
      forID: ObjectId(req.params.forID),
      lastModified: new Date(),
      newValues: req.body.changes,
      original: req.body.original,
      changeset: req.body.changeset,
      mediaID: req.body.mediaID //for easy querying of all song edits
    };

    db.collection("revisions").insertOne(revision).then(processRevision.bind(this, revision)).catch(logError);
    });
  }

  return {
    onUpdateRequest: onUpdateRequest,
    processRevision: processRevision,
    finishRevision:  function(revision){ finishRevision(revision) }
  };
};