import request from 'request';

require('dotenv').config();

function getToken() {
  return new Promise((resolve, reject) => {
    const clientID = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    const encoded = (new Buffer(`${clientID}:${clientSecret}`)).toString('base64');

    const options = {
      method: 'POST',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        Authorization: `Basic ${encoded}`,
      },
      form: { grant_type: 'client_credentials' },
    };

    request(options, (err, resp, body) => {
      if (resp.statusCode) {
        const token = JSON.parse(body);
        resolve(token);
      } else {
        reject(err);
      }
    });
  });
}

export default getToken;
