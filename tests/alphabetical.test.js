const assert = require('node:assert/strict');
const test = require('node:test');
const alphabetical = require('../src/alphabetical');

test('trims and removes adjacent exact duplicate links', () => {
  const lines = [
    '- [Name ](https://example.com)\n',
    '- [Name](https://example.com)\n',
  ];
  const [output, removed] = alphabetical.removeExactDuplicateLinks(lines);
  assert.equal(removed, 1);
  assert.equal(output.length, 1);
  assert.match(output[0], /\[Name]/);
});

test('duplicate matching is case-sensitive for link text', () => {
  const lines = [
    '- [Name](https://example.com)\n',
    '- [name](https://example.com)\n',
  ];
  const [output, removed] = alphabetical.removeExactDuplicateLinks(lines);
  assert.equal(removed, 0);
  assert.equal(output.length, 2);
});

test('normalizes trailing slash URL duplicates', () => {
  const lines = [
    '- [Same](https://example.com/path/)\n',
    '- [Same](https://example.com/path)\n',
  ];
  const [output, removed] = alphabetical.removeExactDuplicateLinks(lines);
  assert.equal(removed, 1);
  assert.equal(output.length, 1);
});

test('non-adjacent duplicates are not collapsed by adjacent duplicate remover', () => {
  const lines = [
    '## A\n',
    '- [A](https://a.com)\n',
    'Some text\n',
    '- [A](https://a.com)\n',
  ];
  const [output, removed] = alphabetical.removeExactDuplicateLinks(lines);
  assert.equal(removed, 0);
  assert.equal(output.length, 4);
});

test('multiple adjacent duplicates collapse to one entry', () => {
  const lines = [
    '- [Foo](https://ex.com)\n',
    '- [Foo](https://ex.com)\n',
    '- [Foo](https://ex.com)\n',
  ];
  const [output, removed] = alphabetical.removeExactDuplicateLinks(lines);
  assert.equal(removed, 2);
  assert.equal(output.length, 1);
});

test('removes standalone leading single-letter tokens from link text', () => {
  assert.match(alphabetical.convertToTitleCase('- [A John Doe](https://example.com)\n'), /\[John Doe]/);
  assert.match(alphabetical.convertToTitleCase('- [a Jane](https://example.com)\n'), /\[Jane]/);
});

test('removes standalone Aaa token and preserves attached Aaa token casing', () => {
  assert.match(alphabetical.convertToTitleCase('- [AaaJohn Doe](https://example.com)\n'), /\[AaaJohn Doe]/);
  assert.match(alphabetical.convertToTitleCase('- [Aaa John Doe](https://example.com)\n'), /\[John Doe]/);
  assert.match(alphabetical.convertToTitleCase('- [Foo AaaBar](https://example.com)\n'), /\[Foo AaaBar]/);
});

test('moves a misplaced entry to the correct section', () => {
  const lines = [
    '## A\n',
    '\n',
    '- [Alice](https://alice.com)\n',
    '- [Zack](https://zack.com)\n',
    '\n',
    '## B\n',
    '\n',
    '- [Bob](https://bob.com)\n',
    '\n',
    '## Z\n',
    '\n',
    '- [Zoe](https://zoe.com)\n',
  ];
  const [output, moved] = alphabetical.validateSectionPlacement(lines);
  assert.equal(moved, 1);
  const text = output.join('');
  assert.doesNotMatch(text.split('## B')[0], /Zack/);
  assert.match(text.split('## Z')[1], /Zack/);
});

test('moves multiple misplaced entries', () => {
  const lines = [
    '## A\n',
    '\n',
    '- [Alice](https://alice.com)\n',
    '- [Bob Entry](https://bob.com)\n',
    '- [Charlie Entry](https://charlie.com)\n',
    '\n',
    '## B\n',
    '\n',
    '- [Ben](https://ben.com)\n',
    '\n',
  ];
  const [_output, moved] = alphabetical.validateSectionPlacement(lines);
  assert.equal(moved, 2);
});

test('normalizes accented first characters for section placement', () => {
  const lines = [
    '## A\n',
    '\n',
    '- [Alice](https://alice.com)\n',
    '- [Étienne](https://etienne.com)\n',
    '\n',
    '## E\n',
    '\n',
    '- [Emma](https://emma.com)\n',
  ];
  const [_output, moved] = alphabetical.validateSectionPlacement(lines);
  assert.equal(moved, 1);
});

test('does not move correctly placed entries', () => {
  const lines = [
    '## A\n',
    '\n',
    '- [Alice](https://alice.com)\n',
    '- [Andrew](https://andrew.com)\n',
    '\n',
    '## B\n',
    '\n',
    '- [Bob](https://bob.com)\n',
  ];
  const [_output, moved] = alphabetical.validateSectionPlacement(lines);
  assert.equal(moved, 0);
});

test('creates a missing section for a moved entry', () => {
  const lines = [
    '## A\n',
    '\n',
    '- [Alice](https://alice.com)\n',
    '- [Zoe Entry](https://zoe.com)\n',
    '\n',
    '## B\n',
    '\n',
    '- [Bob](https://bob.com)\n',
  ];
  const [output, moved] = alphabetical.validateSectionPlacement(lines);
  assert.equal(moved, 1);
  assert.match(output.join(''), /## Z/);
  assert.match(output.join(''), /Zoe Entry/);
});
