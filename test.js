const { MeiliSearch } = require('meilisearch');
const client = new MeiliSearch({ host: 'http://localhost:7700' });

async function testSearch() {
  const index = client.index('services');
  console.log(index)
  const result = await index.search('photo');
  console.log(result.hits);
}

testSearch();
