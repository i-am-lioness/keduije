var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');


// Connection URL
var url = 'mongodb://localhost:27017/igbo';
var url = 'mongodb://igbo:igbo@ds111940.mlab.com:11940/igbo';
var database;


function processLyrics(lyrics){
  var lastEndTime = 0;
  for (var i=0; i < lyrics.length; i ++){
    lyrics[i].startTime=lastEndTime;
    lastEndTime = lyrics[i].time;
    lyrics[i].endTime = lastEndTime;
    lyrics[i].id = i;
    lyrics[i].deleted = false;
    lyrics[i].isHeading = false;
  }

  console.log("song:");
  //console.log(lyrics);
}


function convertNumbers(lyrics){
  for (var i=0; i < lyrics.length; i++){
    lyrics[i].startTime=parseInt(lyrics[i].startTime);
    lyrics[i].endTime = parseInt(lyrics[i].endTime);
    delete lyrics[i].time;
  }

  console.log("song:");
  //console.log(lyrics);
}


// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  database = db;

  database.collection('lyrics').find().toArray(function(err, songs) {
    songs.forEach(function(song){
      console.log(song);
      //convertNumbers(song.lyrics);

      //updateInDB(song);

    })
  });
});


function updateInDB(song){
  database.collection('lyrics').update(
    {_id: song._id},
    song,
    function(err, n, object) {
      console.log("update completed");
      if (err){
          console.warn(err.message);  // returns error if no matching object found
      }else{
          console.dir(object);
      }
    });

}

/*
app.get('/lyrics/:videoID', function (req, res) {

  database.collection('lyrics')
    .find({ videoID: req.params.videoID } )
    .nextObject(function(err, obj) {
    console.log(obj)

    var result = (obj) ? obj.lyrics : [];
    res.send(result);
  })
});

app.get('/music/:videoID', function (req, res) {

  database.collection('lyrics')
    .find({ videoID: req.params.videoID } )
    .nextObject(function(err, obj) {
      console.log(obj)

      var lyrics = (obj) ? obj.lyrics : [];

      res.render('player', {
        title: "hello",
        videoID: req.params.videoID
      });
  })
});


app.post('/', function (req, res) {

  console.log(req.body);
  var obj = req.body;
  //res.send(obj);

  database.collection('lyrics').update(
     { videoID: obj.videoID } ,
     { $set: { lyrics: obj.lyrics } },
     { upsert: true },
     function(err, result) {
       assert.equal(err, null);
       res.send(result);
     }
  );

});

app.get('/test', function (req, res) {

  var obj = {videoID: "hello", lyrics: [1, 2, 3]};

  database.collection('lyrics').update(
     { videoID: obj.videoID } ,
     { $set: { lyrics: obj.lyrics } },
     { upsert: true },
     function(err, result) {
       assert.equal(err, null);
       res.send(result);
     }
  );

});
*/

/*
var insertDocuments = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('documents');
  // Insert some documents
  collection.insertMany([
    {a : 1}, {a : 2}, {a : 3}
  ], function(err, result) {
    assert.equal(err, null);
    assert.equal(3, result.result.n);
    assert.equal(3, result.ops.length);
    console.log("Inserted 3 documents into the collection");
    callback(result);
  });
}

var findDocuments = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('documents');
  // Find some documents
  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);
    console.log("Found the following records");
    console.log(docs)
    callback(docs);
  });
}
*/
