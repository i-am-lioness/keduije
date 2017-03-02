var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');
var express = require('express');
var app = express();
const bodyParser= require('body-parser');
var cors = require('cors')
var path = require('path');

// Connection URL
var url = 'mongodb://localhost:27017/igbo';
var url = 'mongodb://igbo:igbo@ds111940.mlab.com:11940/igbo';
var database;

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(cors()); //may no longer be used
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', function (req, res) {

  res.sendFile(path.join(__dirname+'/public/player.html'));

});

app.get('/all', function (req, res) {
  //res.send('Hello World!');
  database.collection('lyrics').find().toArray(function(err, results) {
    console.log(results)
    // send HTML file populated with quotes here
    res.send(results);
  })
});

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

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  database = db;

  var port = (process.env.PORT || 3000);
  app.listen(port, function () {
    console.log('Example app listening on port ' + port + "!");
  })

});


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
