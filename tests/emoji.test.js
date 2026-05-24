const assert = require('node:assert/strict');
const test = require('node:test');
const alphabetical = require('../src/alphabetical');

test('detects emoji in link text', () => {
  assert.equal(alphabetical.linkTextHasEmoji('- [Alice 😊](https://example.com)\n'), true);
});

test('does not detect emoji when link text has none', () => {
  assert.equal(alphabetical.linkTextHasEmoji('- [Alice](https://example.com)\n'), false);
});

test('detects emoji in bracketed adjacent description', () => {
  assert.equal(alphabetical.emojiAdjacentToLink('- [Foo](https://x) [Dev 😄]\n'), true);
});

test('detects emoji in parenthesized adjacent description', () => {
  assert.equal(alphabetical.emojiAdjacentToLink('- [Foo](https://x) (😄)\n'), true);
});

test('detects ZWJ emoji sequences through pictographic codepoints', () => {
  assert.equal(alphabetical.linkTextHasEmoji('- [Family 👨‍👩‍👧](https://x)\n'), true);
});

test('emoji in URL does not count as link text or adjacent description emoji', () => {
  const line = '- [Name](https://example.com/😀)\n';
  assert.equal(alphabetical.linkTextHasEmoji(line), false);
  assert.equal(alphabetical.emojiAdjacentToLink(line), false);
});

test('removes emoji from link text', () => {
  const [lines, removed] = alphabetical.removeEmojiFromLines(['- [Alice 😊](https://example.com)\n']);
  assert.equal(removed, 1);
  assert.match(lines[0], /\[Alice]/);
});

test('removes emoji from bracketed description', () => {
  const [lines, removed] = alphabetical.removeEmojiFromLines(['- [Foo](https://x) [Dev 😄]\n']);
  assert.equal(removed, 1);
  assert.match(lines[0], /\[Dev]/);
});

test('removes emoji from parenthesized description', () => {
  const [lines, removed] = alphabetical.removeEmojiFromLines(['- [Foo](https://x) (😄)\n']);
  assert.equal(removed, 1);
  assert.match(lines[0], /\(\)/);
});

test('leaves lines without emoji unchanged', () => {
  const original = ['- [Alice](https://example.com)\n'];
  const [lines, removed] = alphabetical.removeEmojiFromLines(original);
  assert.equal(removed, 0);
  assert.deepEqual(lines, original);
});
