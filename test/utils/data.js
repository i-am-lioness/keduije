const changesets = require('./data/changesets.json');
const revisions = require('./data/revisions.json');
const lines = require('./data/lines.json');
const media = require('./data/media.json');

const ObjectId = require('mongodb').ObjectId;

function convertObjectIds(obj) {
  Object.keys(obj).forEach((field) => {
    const val = obj[field];
    if ((val !== null) && (typeof val === 'object')) {
      if ('$oid' in val) {
        obj[field] = ObjectId(val.$oid);
      } else if ('$date' in val) {
        obj[field] = new Date(val.$date);
      } else {
        convertObjectIds(obj[field]);
      }
    }
  });
}


function convertStrictMode(arr) {
  arr.forEach(convertObjectIds);
}

convertStrictMode(changesets);
convertStrictMode(revisions);
convertStrictMode(lines);
convertStrictMode(media);

const lyrics = [{ _id: '58e80748878e98070772e326', text: 'a di kwa mu loyal o', endTime: 56, deleted: 'false', startTime: 54, heading: '', changeset: '58e7e8f708091bfe6d06a49a', creator: '58e451206b5df803808e5912', mediaID: '58e745d22f1435db632f81fa', version: 1 }, { _id: '58e746de2f1435db632f81fd', text: 'Chineke Nna emego kwa nwa ogbenye ezege', endTime: 19, deleted: 'false', startTime: 15, heading: 'verse 1', changeset: '58e746a32f1435db632f81fb', creator: '58e451206b5df803808e5912', mediaID: '58e745d22f1435db632f81fa', version: 2, pendingRevisions: [], lastModified: '2017-04-14T21:39:47.840Z' }, { _id: '58e7e85808091bfe6d06a498', text: 'never forget where i come from na from ghetto', endTime: 37, deleted: 'false', startTime: 34, heading: '', changeset: '58e7e82a08091bfe6d06a496', creator: '58e451206b5df803808e5912', mediaID: '58e745d22f1435db632f81fa', version: 1 }, { _id: '58e7e86808091bfe6d06a499', text: 'I just want to say oh "Thank you Jehovah" oh', endTime: 45, deleted: 'false', startTime: 42, heading: '', changeset: '58e7e82a08091bfe6d06a496', creator: '58e451206b5df803808e5912', mediaID: '58e745d22f1435db632f81fa', version: 1 }, { _id: '58e80758878e98070772e327', text: 'fada fada eh, fada fada eh', endTime: 61, deleted: 'false', startTime: 56, heading: '', changeset: '58e7e8f708091bfe6d06a49a', creator: '58e451206b5df803808e5912', mediaID: '58e745d22f1435db632f81fa', version: 1 }];

const songInfo = { _id: '58e46ebdf3a3f330ed306e75', creator: '58e451206b5df803808e5912', status: 'published', version: 3, pendingRevisions: [], lastModified: '2017-04-07T03:52:36.203Z', title: 'Achikolo', src: 'https://www.youtube.com/watch?v=h01_dEXLqsk', videoID: 'h01_dEXLqsk', type: '1', slug: 'Achikolo', views: 16, artist: 'Zoro ft Phyno', img: 'https://i.scdn.co/image/ae0bd67101913215b25330bb4286463c2680ca8b' };

const searchResults = [{ _id: '5900a5987dccb248571bcaf8', title: 'Sweet Like Tomb', artist: 'Waconzy', slug: 'Sweet-Like-Tomb' }, { _id: '5901e9bf61b02a9ceb59c1d7', title: 'Wizboyy - Fine Baby', artist: null, slug: 'Wizboyy-Fine-Baby' }];

export { lyrics,
  songInfo,
  changesets,
  lines,
  revisions,
  searchResults,
  media,
};
