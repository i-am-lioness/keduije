/* eslint-env browser */
/* global $ */

let songID = null;
let changesetID = null;

function onError(errorMsg, url, lineNumber, column, errorObj) {
  if (window.location.hostname === 'localhost') return;

  const msg = `Error: ${errorMsg
  } Script: ${url
  } Line: ${lineNumber
  } Column: ${column
  } StackTrace: ${errorObj}`;

  $.post('/api/logError', { width: screen.width, height: screen.height, msg: msg });
}

window.onerror = onError;

function search(q) {
  return $.get('/api/search', { query: q });
}

function loadLyrics() {
  return $.get(`/api/lines/${songID}`);
}

function getChangesets(query) {
  return $.get('/api/changesets/list', query);
}

function startEditSession(isStart) {
  if (isStart) {
    return $.post(`/api/start_edit/${songID}`)
      .then((resp) => {
        changesetID = resp;
        return true;
      })
      .catch((err) => {
        console.error(err);
        alert('You cannot edit at this time.');
      });
  }
  changesetID = null;
  return Promise.resolve(false);
}

function loadSongInfo() {
  return $.get(`/api/media/${songID}`);
}

function addLyric(newLyric) {
  newLyric.changesetID = changesetID;
  return $.post(`/api/media/${songID}/addline`, newLyric);
}

function updateLyric(oldLyricObj, newLyricObj) {
  // todo: postdata should be validated
  const postData = {
    original: oldLyricObj,
    changes: newLyricObj,
    mediaID: songID,
    changesetID,
  };

  return $.post(`/api/lines/edit/${oldLyricObj._id}`, postData);
}

function deleteLyric(oldLyricObj) {
  return updateLyric(oldLyricObj, { deleted: true });
}

function saveSongInfo(original, changes) {
  // todo: postdata should be validated
  const postData = {
    original: original,
    changes,
    changesetID,
    mediaID: songID, // for easy querying
  };

  return $.post(`/api/media/edit/${songID}`, postData);
}

function createSong(songInfo) {
  return $.post('/api/media/new', songInfo);
}

function deleteSong(original) {
  return saveSongInfo(original, { status: 'deleted' })
    .then(() => { window.location = '/'; });
  // todo: catch error
}

const ki = {};

ki.init = (_songID) => {
  songID = _songID;
};

// to do: consider using
/* function wrap(func) {
  return wrap.catch((err) => { console.log(err); });
} */

ki.loadLyrics = loadLyrics;
ki.loadSongInfo = loadSongInfo;
ki.updateLyric = updateLyric;
ki.addLyric = addLyric;
ki.saveSongInfo = saveSongInfo;
ki.search = search;
ki.startEditSession = startEditSession;
ki.getChangesets = getChangesets;
ki.deleteLyric = deleteLyric;
ki.deleteSong = deleteSong;
ki.createSong = createSong;

const editModes = {
  ADD: 'add',
  UPDATE: 'save',
};

export { ki as default, editModes };
