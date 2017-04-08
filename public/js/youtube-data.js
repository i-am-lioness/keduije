/* global gapi */
function getIDFromURL(url) {
  const res = url.match(/[?&]v=([^&]+)/);
  if (res) {
    return res[1];
  }
  return false;
  // alert("error with url provided");
}

function googleApiClientReady() {
  gapi.client.init({
    apiKey: 'AIzaSyBLYlu4hbmzhr1iOCiD_o2PTrjzvQBuQUA',
  }).then(() => {
    gapi.client.load('youtube', 'v3', () => {
      // handleAPILoaded();
    });
  });
}

/*
{
"default": {"url":"https://i.ytimg.com/vi/8W2FDUQ99BU/default.jpg","width":120,"height":90},
"medium": {"url":"https://i.ytimg.com/vi/8W2FDUQ99BU/mqdefault.jpg","width":320,"height":180},
"high":{"url":"https://i.ytimg.com/vi/8W2FDUQ99BU/hqdefault.jpg","width":480,"height":360},
"standard":{"url":"https://i.ytimg.com/vi/8W2FDUQ99BU/sddefault.jpg","width":640,"height":480},
"maxres":{"url":"https://i.ytimg.com/vi/8W2FDUQ99BU/maxresdefault.jpg","width":1280,"height":720}
}
*/
