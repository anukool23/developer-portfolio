const { createFeedJson, extractPortfolioData } = require('./alphabetical');

function main() {
  const portfolioCount = createFeedJson();
  if (portfolioCount) {
    console.log(`Successfully created feed.json with ${portfolioCount} portfolio entries.`);
    return 0;
  }
  console.error('Failed to create feed.json');
  return 1;
}

module.exports = {
  createFeedJson,
  extractPortfolioData,
  main,
};

if (require.main === module) {
  process.exitCode = main();
}
