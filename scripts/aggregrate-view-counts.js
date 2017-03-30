require('dotenv').config()
var MongoClient = require('mongodb').MongoClient;

var db;
var res;

function forSong(err,song){
  if(song==null){
    db.close();
    return;
  }
  console.log(song.title);

  song.history = song.history || [];
  song.history.push({asOf: new Date(), views: song.views});


  var weeklyTotal = 0;
  song.history.forEach((el)=>{
    //todo: actually check the dates to make sure they are within the period in question
    weeklyTotal += el.views;
  });

  if(song.history.length > 4) //will eventually be removed
    song.history.shift();

  song.totalViews = weeklyTotal;
  song.views = 0;

  db.collection('lyrics').save(song, ()=>{
    res.nextObject(forSong);
  });
}

MongoClient.connect(process.env.DB_URL, function(err, _db) {
  console.log("Connected successfully to server");
  db=_db;

  res = db.collection('lyrics').find();

  res.nextObject(forSong);

});
