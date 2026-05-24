const fs = require('node:fs');
const { normalizeUrl } = require('./alphabetical');

function main() {
  let lines;
  try {
    lines = fs.readFileSync('README.md', 'utf8').split(/(?<=\n)/);
    if (lines.at(-1) === '') lines.pop();
  } catch (_error) {
    console.error('README.md not found');
    return 2;
  }

  const seen = new Map();
  const urlDuplicates = [];
  lines.forEach((line, index) => {
    const match = line.match(/\(([^)]+)\)/);
    if (!match) return;
    const raw = match[1];
    const normalized = normalizeUrl(raw);
    if (seen.has(normalized)) {
      urlDuplicates.push({ index, line: line.trimEnd(), normalized, firstIndex: seen.get(normalized) });
    } else {
      seen.set(normalized, index);
    }
  });

  const adjacentDuplicates = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    let nextIndex = index + 1;
    const textMatch = line.match(/\[([^\]]*?)]/);
    const urlMatch = line.match(/\(([^)]+)\)/);
    if (textMatch && urlMatch) {
      const text = textMatch[1].trimEnd();
      const normalized = normalizeUrl(urlMatch[1]);
      while (nextIndex < lines.length) {
        const nextTextMatch = lines[nextIndex].match(/\[([^\]]*?)]/);
        const nextUrlMatch = lines[nextIndex].match(/\(([^)]+)\)/);
        if (!nextTextMatch || !nextUrlMatch) break;
        if (nextTextMatch[1].trimEnd() === text && normalizeUrl(nextUrlMatch[1]) === normalized) {
          adjacentDuplicates.push({
            index: nextIndex,
            line: lines[nextIndex].trimEnd(),
            text,
            normalized,
            firstIndex: index,
          });
          nextIndex += 1;
          continue;
        }
        break;
      }
    }
    index = nextIndex;
  }

  const combinedIndices = [...new Set([
    ...urlDuplicates.map((duplicate) => duplicate.index),
    ...adjacentDuplicates.map((duplicate) => duplicate.index),
  ])].sort((a, b) => a - b);

  console.log('Duplicate detection report for README.md');
  console.log('Total lines:', lines.length);
  console.log('URL-based duplicates found (document-wide, keep first occurrence):', urlDuplicates.length);
  console.log('Adjacent exact-link duplicates found (collapsing adjacent runs):', adjacentDuplicates.length);
  console.log('Combined unique lines that would be removed:', combinedIndices.length);
  console.log('');

  if (urlDuplicates.length) {
    console.log('First 20 URL-based duplicate examples:');
    urlDuplicates.slice(0, 20).forEach((duplicate) => {
      console.log(`line ${String(duplicate.index).padStart(4)} (keep @ ${String(duplicate.firstIndex).padStart(4)}): ${duplicate.normalized}  -> ${duplicate.line}`);
    });
    console.log('');
  }

  if (adjacentDuplicates.length) {
    console.log('First 20 adjacent-exact duplicate examples:');
    adjacentDuplicates.slice(0, 20).forEach((duplicate) => {
      console.log(`line ${String(duplicate.index).padStart(4)} (keep @ ${String(duplicate.firstIndex).padStart(4)}): [${duplicate.text}] ${duplicate.normalized}  -> ${duplicate.line}`);
    });
    console.log('');
  }

  if (combinedIndices.length) {
    console.log('First 50 combined line indices:');
    combinedIndices.slice(0, 50).forEach((lineIndex) => console.log(lineIndex));
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { main };
