require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;

let db;

function forSong(song) {
  console.log(song.title);

  song.history = song.history || [];
  song.history.push({ asOf: new Date(), views: song.views });


  let weeklyTotal = 0;
  song.history.forEach((el) => {
    // todo: actually check the dates to make sure they are within the period in question
    weeklyTotal += el.views;
  });

  // will eventually be removed
  if (song.history.length > 4) {
    song.history.shift();
  }

  song.totalViews = weeklyTotal;
  song.views = 0;

  db.collection('media').save(song);
}

MongoClient.connect(process.env.DB_URL, (err, _db) => {
  console.log('Connected successfully to server');
  db = _db;

  db.collection('media').find().forEach(forSong, () => {
    db.close();
    process.exit();
  });
});
