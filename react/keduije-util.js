/* eslint-env browser */
/* global $, gapi */
const KeduIjeUtil = ((ki) => {
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
    if (!q) {
      throw Error;
    }
    const request = gapi.client.youtube.videos.list({
      id: q,
      part: 'snippet',
    });

    return new Promise((resolve, reject) => {
      request.execute((response) => {
        if (response.items) {
          resolve(response.items[0]);
        }
        return null; // to do: consider throwing error
      });
    });
  }

  function loadYoutubeIFrameAPI(cb) {
    window.onYouTubeIframeAPIReady = cb;
    $.getScript('https://www.youtube.com/iframe_api');
  }

  ki.mediaTypes = {
    AUDIO: 0,
    VIDEO: 1,
  };

  ki.searchImages = searchImages;
  ki.getYTdata = getYTdata;
  ki.loadYoutubeIFrameAPI = loadYoutubeIFrameAPI;

  return ki;
})({});

module.exports = KeduIjeUtil;

