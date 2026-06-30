const https = require('https');

https.get('https://api.crispydosa.info/mobile/restaurants', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('restaurants:', data.substring(0, 500)));
}).on('error', console.error);
