var ObjectId = require('mongodb').ObjectId;
var slugify = require('slugify');

module.exports = function( req, res, db, sendLines, errorCB){
  //todo: store revision object within closure
  //todo: get rid of sendLines

  function logError(err){ //todo: revisit
    if(errorCB)
      errorCB(err, res);
    else
      console.log(err);
  }


  function commitRevision(revision){
    revision.state="applied";
    db.collection("revisions").save(revision).then(function(){
      db.collection(revision.target).updateOne(
        { _id: revision.forID, pendingRevisions: revision._id},
        {$pull: {pendingRevisions: revision._id}}
      ).then(function(result){
        revision.state="done";
        db.collection("revisions").save(revision);
      });
    }).catch(logError);
  }

  function getVersionNumber(revision) {
	return new Promise((resolve, reject) => {

    if(revision.original){
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
            reject("Version "+ versionNumber + " already edited.");

            revision.state="canceled";
            db.collection("revisions").save(revision);
          }
        }).catch(reject);
      }else{
        //not needed for new media
        resolve(1);
      }
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
        //todo: replace with parameterized callbacks

        if(res){
          //console.log("response object", res);
          if(revision.target=="media"){
            res.send(result.value); //todo: error checking
          } else if(revision.target=="lines"){
            sendLines(result.value.mediaID, res);
          }else {
            res.send("error, unrecognized db collection name: "+ revision.target);
          }
        }

        commitRevision(revision)
      }
    ).catch(logError);
  }


  function processRevision(revision){

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

  }

  function executeEdit(target){
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
  }

  return {
    executeEdit: function(target){ executeEdit(target); },
    processRevision:  function(revision){ processRevision(revision) }
  };
};