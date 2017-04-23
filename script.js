/* eslint no-console: 0 */
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const url = 'mongodb://igbo:igbo@ds151070.mlab.com:51070/igbo_dev';
let db;

function upgradeLines() {
  db.collection('lines').find().forEach((line) => {
    console.log(line.text);
    line.media = ObjectId(line.mediaID);
    line.changeset = ObjectId(line.changeset);
    // delete line.mediaID;
    db.collection('lines').save(line);
  }, () => {
    db.close();
    process.exit(0);
  });
}

function deleteMediaProp() {
  db.collection('lines').find().forEach((line) => {
    console.log(line.text);
    delete line.mediaID;
    db.collection('lines').save(line);
  }, () => {
    db.close();
    process.exit(0);
  });
}

function upgradeChangesets() {
  db.collection('changesets').find().forEach((cs) => {
    //console.log(cs.text);
    cs.media = ObjectId(cs.mediaID);
    delete cs.mediaID;
    db.collection('changesets').save(cs);
  }, () => {
    db.close();
    process.exit(0);
  });
}

function upgradeMedia() {
  db.collection('media').find().forEach((media) => {
    console.log(media.title);
    if (media.changeset) {
      media.changeset = ObjectId(media.changeset);
      db.collection('media').save(media);
    }
  });
}

function upgradeRevisions() {
  db.collection('revisions').find().forEach((r) => {
    if (r.original) {
      const original = r.original;
      console.log(original.text);
      if (original.creator) {
        original.creator = ObjectId(original.creator);
      }
      if (original.mediaID) {
        original.media = ObjectId(original.mediaID);
        delete original.mediaID;
      }
      if (original._id) {
        original._id = ObjectId(original._id);
      }
    }
    if (r.mediaID) {
      r.media = ObjectId(r.mediaID);
      delete r.mediaID;
    }
    if (r.changeset) {
      r.changeset = ObjectId(r.changeset);
    }

    db.collection('revisions').save(r);
  });
}


// Use connect method to connect to the server
MongoClient.connect(url, (err, _db) => {
  console.log('Connected successfully to server');
  db = _db;

  upgradeRevisions();
});

