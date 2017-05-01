

let db;

function getMediaInfo(m) {
  // use constant list of fields, or "info field"
  return {
    artist: m.artist,
    title: m.title,
    img: m.img,
  };
}

function saveSnapshot(m) {
  const snapshot = {
    date: new Date(),
    info: getMediaInfo(m),
    lines: m.lines,
  };
/*
  let weeklyTotal = 0;
  if (m.stats.history) {
    m.stats.history.forEach((val) => {
      weeklyTotal += val;
    });
  }
*/
  const updateDoc = {
    $push: {
      archive: {
        $each: [snapshot],
        $slice: -5,
      },
      'stats.history': {
        $each: [m.stats.views],
        $slice: -7,
      },
    },
    $set: {
      'stats.weeklyTotal': m.weeklyTotal,
      'stats.views': 0,
    },
  };
  return db.collection('media').updateOne({ _id: m._id }, updateDoc).then(() => {
    console.log('successfuly saved snapshot for  media #', m._id);
  }).catch((err) => {
    console.log(`Failed to save snapshot for media #${m._id} (${err})`);
  });
}

function archiveLyrics(_db) {
  console.log('Scanning for empty changesets.');
  db = _db;
  return new Promise((resolve, reject) => {
    const snapshots = [];
    let s;
    db.collection('media').aggregate([
      { $lookup: {
        from: 'lines',
        localField: '_id',
        foreignField: 'media',
        as: 'lines',
      } },
      { $project: {
        'stats.views': 1,
        // 'stats.history': 1,
        weeklyTotal: { $sum: '$stats.history' },
        // to do. "info" document
        title: 1,
        artist: 1,
        img: 1,
        lines: 1,
      } }
    ]).each((err, media) => {
      if (err) console.error(err);
      if (media) {
        console.log('weeklyTotal', media.weeklyTotal);
        s = saveSnapshot(media);
        snapshots.push(s);
      } else {
        Promise.all(snapshots).then(resolve);
      }
    });
  });
}

module.exports = archiveLyrics;
