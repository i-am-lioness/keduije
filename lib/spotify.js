import request from 'request';

function getToken(clientID, clientSecret) {
  return new Promise((resolve, reject) => {
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
      if (resp.statusCode === 200) {
        const token = JSON.parse(body);
        resolve(token);
      } else if (resp.statusCode) {
        reject(body);
      } else {
        reject(err);
      }
    });
  });
}

export default getToken;
