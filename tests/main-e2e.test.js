const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const alphabetical = require('../src/alphabetical');

test('main trims, deduplicates, normalizes descriptions, and writes backup/feed', () => {
  const original = [
    '# Test README\n',
    '\n',
    '## A\n',
    '\n',
    '- [Name ](https://example.com)\n',
    '- [Name](https://example.com)\n',
    '- [Same](https://example.com/path/)\n',
    '- [Same](https://example.com/path)\n',
    '- [Other](https://other.com/)\n',
    '- [Foo](https://foo.com) [Full-Stack]\n',
  ].join('');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'developer-portfolios-node-'));
  const previousCwd = process.cwd();
  try {
    process.chdir(tempDir);
    fs.writeFileSync('README.md', original, 'utf8');

    alphabetical.main();

    assert.equal(fs.readFileSync('README.md.bak', 'utf8'), original);
    const output = fs.readFileSync('README.md', 'utf8');
    assert.equal((output.match(/\[Name]/g) || []).length, 1);
    assert.equal((output.match(/\[Same]/g) || []).length, 1);
    assert.match(output, /Full Stack/);
    assert.match(output, /example.com\/path/);

    const feed = JSON.parse(fs.readFileSync('feed.json', 'utf8'));
    assert.equal(feed.length, 4);
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('main normalizes Full Stack variants only inside adjacent descriptions', () => {
  const variants = [
    'Full-Stack',
    'Full - Stack',
    'FullStack',
    'Fullstack',
    'Full_stack',
    'FULLSTACK',
    'Full—Stack',
    'Full / Stack',
  ];
  const lines = ['# Test\n', '## A\n'];
  variants.forEach((variant, index) => {
    lines.push(`- [Person${index}](http://example${index}.com) [${variant}]\n`);
  });
  lines.push('\nThis Full-Stack mention should NOT be changed in paragraph text.\n');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'developer-portfolios-node-'));
  const previousCwd = process.cwd();
  try {
    process.chdir(tempDir);
    fs.writeFileSync('README.md', lines.join(''), 'utf8');

    alphabetical.main();

    const output = fs.readFileSync('README.md', 'utf8');
    variants.forEach((_variant, index) => {
      assert.match(output, new RegExp(`Person${index}`));
    });
    assert.equal((output.match(/Full Stack/g) || []).length, variants.length);
    assert.match(output, /This Full-Stack mention should NOT be changed in paragraph text\./);
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
