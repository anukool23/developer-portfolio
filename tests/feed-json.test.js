const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { extractPortfolioData } = require('../src/alphabetical');

test('extracts portfolio data from markdown lines', () => {
  const portfolios = extractPortfolioData([
    '- [Alice Smith](https://alice.com) [Full Stack Developer]\n',
    '- [Bob Jones](https://bob.dev)\n',
    '- [Carol White](https://carol.io) [UI/UX Designer | Frontend Dev]\n',
    '## Some Header\n',
    'Not a portfolio line\n',
    '- [Dave Brown](https://dave.com) []\n',
  ]);

  assert.equal(portfolios.length, 4);
  assert.deepEqual(portfolios[0], {
    name: 'Alice Smith',
    url: 'https://alice.com',
    tagline: 'Full Stack Developer',
  });
  assert.deepEqual(portfolios[1], {
    name: 'Bob Jones',
    url: 'https://bob.dev',
  });
  assert.equal(portfolios[2].tagline, 'UI/UX Designer | Frontend Dev');
  assert.equal('tagline' in portfolios[3], false);
});

test('feed.json has valid structure when present', () => {
  const raw = fs.readFileSync('feed.json', 'utf8');
  const portfolios = JSON.parse(raw);
  assert.equal(Array.isArray(portfolios), true);
  assert.equal(portfolios.length > 0, true);

  portfolios.forEach((portfolio, index) => {
    assert.equal(typeof portfolio.name, 'string', `Entry ${index} name should be a string`);
    assert.equal(typeof portfolio.url, 'string', `Entry ${index} url should be a string`);
    if ('tagline' in portfolio) {
      assert.equal(typeof portfolio.tagline, 'string', `Entry ${index} tagline should be a string`);
    }
  });
});
