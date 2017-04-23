/* eslint-env browser */
/* global $ */

const API_KEY = 'AIzaSyBLYlu4hbmzhr1iOCiD_o2PTrjzvQBuQUA';

function searchImages(q) {
  const query = { type: 'track', q: q };
  return $.get('https://api.spotify.com/v1/search', query).then((data) => {
    const images = data.tracks.items.map(el => el.album.images[0].url);
    return images;
  });
}

function getIDFromURL(url) {
  const res = url.match(/[?&]v=([^&]+)/);
  if (res) {
    return res[1];
  }
  return false;
}

function getYTdata(url) {
  const q = getIDFromURL(url);

  const query = {
    id: q,
    part: 'snippet',
    key: API_KEY,
  };

  return new Promise((resolve, reject) => {
    if (!q) {
      reject(new Error('No Video ID found.'));
    }

    $.get('https://www.googleapis.com/youtube/v3/videos', query)
      .then((response) => {
        if (response.items && (response.items.length > 0)) {
          resolve(response.items[0]);
        } else {
          reject(new Error('Video data not found.'));
        }
      });
  });
}

function loadYoutubeIFrameAPI(cb) {
  window.onYouTubeIframeAPIReady = cb;
  $.getScript('https://www.youtube.com/iframe_api');
}
// responsively adjusts scroll position of lyrics during playback
function scrollIfOutOfView(element) {
  const position = $(element).offset().top;
  const windowTop = $(window).scrollTop();
  const height = $(window).height();
  const windowBottom = windowTop + (height * 0.7);

  if ((position < windowTop) || (position > windowBottom)) {
    $('html,body').animate({ scrollTop: position - (height * 0.2) }, 800);
  }
}

function convertToTime(sec) {
  let seconds = parseInt(sec, 10);
  const minutes = seconds / 60;
  seconds %= 60;
  if (seconds < 10) seconds = '0' + seconds;
  return Math.floor(minutes) + ':' + seconds;
}

const ki = {
  searchImages,
  getYTdata,
  loadYoutubeIFrameAPI,
  scrollIfOutOfView,
  convertToTime,
};

ki.mediaTypes = {
  AUDIO: 0,
  VIDEO: 1,
};

module.exports = ki;

