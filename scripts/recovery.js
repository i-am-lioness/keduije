require('dotenv').config()
var MongoClient = require('mongodb').MongoClient;
const revision = require('../lib/revision.js');
var ObjectId = require('mongodb').ObjectId;

var db;
var dateThreshold = new Date();
dateThreshold.setMinutes(dateThreshold.getMinutes() - 30);


function deleteChangeset(c){
  console.log("to delete changeset #", c._id);
  db.collection('changesets').deleteOne({_id: c._id}).then(()=>{
    console.log("successfuly deleted changeset #", c._id);
  }).catch((err)=>{
    console.log("Failed to delete changeset #" + c._id + " ("+ err + ")");
  });
}

MongoClient.connect(process.env.DB_URL, function(err, _db) {
  console.log("Connected successfully to db");

  db=_db;

  db.collection('revisions')
  .find({state: "pending", lastModified: { $lt: dateThreshold }})
  .forEach((r)=>{
    console.log("recovering pending revision:",r._id);
    revision(db).processRevision(r).then(function(){
      console.log("revision #" + r._id + " successfully processed");
    }).catch(function(err){
      console.log("revision #" + r._id + " failed to processed ("+err+")");
    });
  });

  db.collection('revisions')
  .find({state: "applied", lastModified: { $lt: dateThreshold }})
  .forEach((r)=>{
    console.log("finishing applied revision:",r);
    revision(db).finishRevision(r);
  });

  //todo: also remove revisions withe empty "newValues"
  db.collection('revisions')
  .find({state: "canceled"})
  .forEach((r)=>{
    console.log("deleting canceled revision:",r._id);
    db.collection('revisions').deleteOne({_id: r._id}).then(function(){
      console.log("revision #" + r._id + " successfully deleted");
    }).catch(function(err){
      console.log("revision #" + r._id + " failed to delete ("+err+")");
    });
  });

  /*
  todo: consider aggregation function. would need to save changest ids in revision as ObjectID
  db.changesets.aggregate([{$lookup: {from: "revisions", localField: "_id", foreignField:"changeset", as: "revs"}}])
   */
  db.collection('changesets')
  .find({})
  .forEach((c)=>{
    var changesetID = c._id.toString();
    if(c.type && (c.type=="new")){
      db.collection('media').find({changeset: changesetID}).count().then((cnt)=>{
        console.log("changeset ("+ changesetID + ") has "+ cnt + " media listings.");
        if(cnt==0){
          deleteChangeset(c);
        }
      });
    }else{
      db.collection('revisions').find({changeset: changesetID}).count().then((cnt)=>{
        
        if(cnt==0){
          db.collection('lines').find({changeset: changesetID}).count().then((cnt2)=>{
            console.log("changeset ("+changesetID + ") has "+ cnt + " revisions and "+ cnt2 + " lines.");
            if(cnt2==0){
              deleteChangeset(c);
            }
          });
        }
      });
    }

  });


});
