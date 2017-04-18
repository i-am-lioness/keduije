/* global $, gapi */
const KeduIjeUtil = ((ki) => {
  function searchImages(q) {
    const query = { type: 'track', q: q };
    return $.get('https://api.spotify.com/v1/search', query).done((data) => {
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

    return request.then((response) => {
      if (response.items) {
        return response.items[0];
      }
      return null; // to do: consider throwing error
    });
  }

  ki.mediaTypes = {
    AUDIO: 0,
    VIDEO: 1,
  };

  ki.searchImages = searchImages;
  ki.getYTdata = getYTdata;

  return ki;
})({});

module.exports = KeduIjeUtil;

