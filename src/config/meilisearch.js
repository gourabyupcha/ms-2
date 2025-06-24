const { MeiliSearch } = require('meilisearch');

exports.meiliClient = new MeiliSearch({
  host: 'http://127.0.0.1:7700',
  // apiKey: 'your_api_key' // optional
});
