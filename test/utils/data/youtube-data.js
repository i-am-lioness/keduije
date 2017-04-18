
const response = {
 "kind": "youtube#videoListResponse",
 "etag": "\"m2yskBQFythfE4irbTIeOgYYfBU/7mwWoJbrirB1obI24hS25E3aFmA\"",
 "pageInfo": {
  "totalResults": 1,
  "resultsPerPage": 1
 },
 "items": [
  {
   "kind": "youtube#video",
   "etag": "\"m2yskBQFythfE4irbTIeOgYYfBU/japU7TqdxxF-N7sDNCziVX1p-N8\"",
   "id": "W5dkXGuR8Tk",
   "snippet": {
    "publishedAt": "2017-04-03T07:13:24.000Z",
    "channelId": "UCgxM2Fy2-lpfjmaSNzOSCPA",
    "title": "Rydda Ft. Zoro - Akachukwu (Official Video)",
    "description": "Effortlessly keeping up with his trademark for delivering nothing less than quality, RYDDA  kick-starts the year by releasing the clean visuals to his new single AKACHUKWU featuring ZORO ,starring FIOOKE, audio was produced  by DJ Coublon. The video births another brilliant presentation by MEX FILMS.\n\nFollow on twitter/instagram: @RYDDA_NWAMAMA",
    "thumbnails": {
     "default": {
      "url": "https://i.ytimg.com/vi/W5dkXGuR8Tk/default.jpg",
      "width": 120,
      "height": 90
     },
     "medium": {
      "url": "https://i.ytimg.com/vi/W5dkXGuR8Tk/mqdefault.jpg",
      "width": 320,
      "height": 180
     },
     "high": {
      "url": "https://i.ytimg.com/vi/W5dkXGuR8Tk/hqdefault.jpg",
      "width": 480,
      "height": 360
     },
     "standard": {
      "url": "https://i.ytimg.com/vi/W5dkXGuR8Tk/sddefault.jpg",
      "width": 640,
      "height": 480
     },
     "maxres": {
      "url": "https://i.ytimg.com/vi/W5dkXGuR8Tk/maxresdefault.jpg",
      "width": 1280,
      "height": 720
     }
    },
    "channelTitle": "RYDDA NWAMAMA",
    "tags": [
     "Zoro",
     "MEX films",
     "DJ Coublon",
     "Rydda",
     "HipHop",
     "Nigerian Music",
     "AFRICA Music"
    ],
    "categoryId": "22",
    "liveBroadcastContent": "none",
    "localized": {
     "title": "Rydda Ft. Zoro - Akachukwu (Official Video)",
     "description": "Effortlessly keeping up with his trademark for delivering nothing less than quality, RYDDA  kick-starts the year by releasing the clean visuals to his new single AKACHUKWU featuring ZORO ,starring FIOOKE, audio was produced  by DJ Coublon. The video births another brilliant presentation by MEX FILMS.\n\nFollow on twitter/instagram: @RYDDA_NWAMAMA"
    }
   }
  }
 ]
}

const processed = response.items[0];

const data = {
  processedResponse: processed,
  videoID: processed.id,
  title: processed.snippet.title,
  thumbnail: processed.snippet.thumbnails.medium.url,
};

export { response, processed, data };
