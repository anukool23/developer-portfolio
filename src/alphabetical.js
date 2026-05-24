const fs = require('node:fs');

function titleCaseWord(word) {
  if (!word) return word;
  return word
    .split(/([-'])/)
    .map((part) => {
      if (part === '-' || part === "'") return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

function convertToTitleCase(readmeText) {
  return readmeText.replace(/\[([^\]]+)](?=\()/g, (_match, inner) => {
    const tokens = inner.split(/[\s\u00A0]+/);
    const cleanedTokens = [];

    for (const token of tokens) {
      const stripped = token.replace(/^[()[\]{},:;"'`—–-]+|[()[\]{},:;"'`—–-]+$/g, '');
      if (!stripped) continue;
      if (stripped.toLowerCase() === 'aaa') continue;
      if (/^[A-Za-z]$/i.test(stripped)) continue;
      cleanedTokens.push(stripped);
    }

    if (cleanedTokens.length === 0) {
      return `[${inner.split(/\s+/).map(titleCaseWord).join(' ')}]`;
    }

    const resultTokens = cleanedTokens.map((token) => {
      const hasInternalCapitals = token.length > 1 && /[A-Z]/.test(token.slice(1));
      const isUppercase = token.length > 1 && token === token.toUpperCase();
      return hasInternalCapitals || isUppercase ? token : titleCaseWord(token);
    });

    return `[${resultTokens.join(' ')}]`;
  });
}

function findDuplicateLines(lines, { ignoreCase = false, ignoreTrailingWhitespace = true } = {}) {
  const positions = new Map();
  const representative = new Map();

  lines.forEach((line, index) => {
    if (line == null || String(line).trim() === '') return;
    let key = String(line);
    if (ignoreTrailingWhitespace) key = key.replace(/\s+$/u, '');
    if (ignoreCase) key = key.toLowerCase();

    if (!positions.has(key)) positions.set(key, []);
    positions.get(key).push(index + 1);
    if (!representative.has(key)) representative.set(key, line);
  });

  const duplicates = {};
  for (const [key, lineNumbers] of positions.entries()) {
    if (lineNumbers.length > 1) duplicates[representative.get(key)] = lineNumbers;
  }
  return duplicates;
}

function validateSectionPlacement(lines) {
  const headerPattern = /^##\s+([A-Z])$/;
  const linkPattern = /^-\s+\[([^\]]+)]/;
  const sectionsOrder = [];
  const sections = new Map();
  const preamble = [];
  let currentSection = null;

  for (const line of lines) {
    const headerMatch = line.trimEnd().match(headerPattern);
    if (headerMatch) {
      currentSection = headerMatch[1];
      if (!sections.has(currentSection)) {
        sections.set(currentSection, { header: line, before: [], entries: [], after: [] });
        sectionsOrder.push(currentSection);
      }
    } else if (currentSection === null) {
      preamble.push(line);
    } else if (line.startsWith('- ')) {
      sections.get(currentSection).entries.push(line);
    } else {
      const section = sections.get(currentSection);
      if (section.entries.length === 0) section.before.push(line);
      else section.after.push(line);
    }
  }

  let movedCount = 0;
  for (const sectionLetter of [...sectionsOrder]) {
    const section = sections.get(sectionLetter);
    const correctEntries = [];

    for (const entry of section.entries) {
      const linkMatch = entry.match(linkPattern);
      if (!linkMatch) {
        correctEntries.push(entry);
        continue;
      }

      const name = linkMatch[1].trim();
      if (!name) {
        correctEntries.push(entry);
        continue;
      }

      const firstChar = name[0].toUpperCase();
      const baseChar = firstChar.normalize('NFD')[0] || firstChar;
      if (!/[A-Z]/.test(baseChar)) {
        correctEntries.push(entry);
        continue;
      }

      if (baseChar === sectionLetter) {
        correctEntries.push(entry);
      } else {
        movedCount += 1;
        if (!sections.has(baseChar)) {
          sections.set(baseChar, { header: `## ${baseChar}\n`, before: ['\n'], entries: [], after: [] });
          const insertIndex = sectionsOrder.findIndex((letter) => letter > baseChar);
          if (insertIndex === -1) sectionsOrder.push(baseChar);
          else sectionsOrder.splice(insertIndex, 0, baseChar);
        }
        sections.get(baseChar).entries.push(entry);
      }
    }

    section.entries = correctEntries;
  }

  const result = [...preamble];
  sectionsOrder.forEach((sectionLetter, index) => {
    const section = sections.get(sectionLetter);
    result.push(section.header);
    result.push(...section.before);
    result.push(...section.entries);
    if (section.after.length) result.push(...section.after);
    else if (section.entries.length && index < sectionsOrder.length - 1) result.push('\n');
  });

  return [result, movedCount];
}

function sortListsAlphabetically(lines) {
  const headerPattern = /^##\s+([A-Z])/;
  const httpPattern = /(https?:\/\/[^\s/]+)\/(?=[)\s]|$)/g;
  let currentHeader = null;
  let listItems = [];
  const sortedLines = [];
  const headerIndices = [];

  lines.forEach((rawLine, index) => {
    const line = rawLine.replace(httpPattern, '$1');
    const headerMatch = line.match(headerPattern);

    if (headerMatch) {
      if (currentHeader && listItems.length) {
        sortedLines.push(...listItems.sort());
        listItems = [];
      }
      currentHeader = headerMatch[1];
      sortedLines.push(line);
      headerIndices.push(index);
    } else if (currentHeader && line.startsWith('- ')) {
      listItems.push(line);
    } else {
      if (listItems.length && !line.startsWith('- ')) {
        if (line.startsWith('  ')) {
          listItems[listItems.length - 1] += line;
          return;
        }
        sortedLines.push(...listItems.sort());
        listItems = [];
      }
      sortedLines.push(line);
    }
  });

  if (currentHeader && listItems.length) sortedLines.push(...listItems.sort());
  return [sortedLines, headerIndices];
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(String(url));
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/u, '');
    return parsed.toString();
  } catch (_error) {
    return String(url);
  }
}

const emojiRanges = [
  [0x1f300, 0x1f5ff],
  [0x1f600, 0x1f64f],
  [0x1f680, 0x1f6ff],
  [0x1f700, 0x1f77f],
  [0x1f780, 0x1f7ff],
  [0x1f800, 0x1f8ff],
  [0x1f900, 0x1f9ff],
  [0x1fa00, 0x1fa6f],
  [0x1fa70, 0x1faff],
  [0x2600, 0x26ff],
  [0x2700, 0x27bf],
  [0x24c2, 0x1f251],
];

function isEmojiCodepoint(codepoint) {
  return emojiRanges.some(([start, end]) => start <= codepoint && codepoint <= end);
}

function hasEmoji(text) {
  if (!text) return false;
  for (const char of text) {
    if (isEmojiCodepoint(char.codePointAt(0))) return true;
  }
  return false;
}

function linkTextHasEmoji(markdownLine) {
  const match = markdownLine && markdownLine.match(/\[([^\]]+)]/);
  return Boolean(match && hasEmoji(match[1]));
}

function emojiAdjacentToLink(markdownLine) {
  if (!markdownLine) return false;
  const bracketMatch = markdownLine.match(/]\s*\([^)]*\)\s*\[([^\]]+)]/);
  if (bracketMatch && hasEmoji(bracketMatch[1])) return true;
  const parenMatch = markdownLine.match(/]\s*\([^)]*\)\s*\(([^)]+)\)/);
  return Boolean(parenMatch && hasEmoji(parenMatch[1]));
}

function removeEmojiChars(text) {
  let removed = 0;
  let output = '';
  for (const char of text || '') {
    if (isEmojiCodepoint(char.codePointAt(0))) {
      removed += 1;
    } else {
      output += char;
    }
  }
  return [output.replace(/[\s\u00A0]+/g, ' ').trim(), removed];
}

function removeEmojiFromLines(lines) {
  let totalRemoved = 0;
  const linkTextPattern = /\[([^\]]+)](?=\()/;
  const adjacentDescriptionPattern = /](\s*\([^)]*\)\s*)(?:\[([^\]]*)]|\(([^)]*)\))/;

  const newLines = lines.map((line) => {
    let modifiedLine = line;
    let removedThisLine = 0;
    const linkMatch = modifiedLine.match(linkTextPattern);

    if (linkMatch) {
      const [newInner, removed] = removeEmojiChars(linkMatch[1]);
      if (removed) {
        modifiedLine = modifiedLine.replace(linkTextPattern, `[${newInner}]`);
        removedThisLine += removed;
      }
    }

    modifiedLine = modifiedLine.replace(adjacentDescriptionPattern, (match, separator, bracketDesc, parenDesc) => {
      if (bracketDesc !== undefined) {
        const [newDesc, removed] = removeEmojiChars(bracketDesc);
        removedThisLine += removed;
        return `]${separator}[${newDesc}]`;
      }
      if (parenDesc !== undefined) {
        const [newDesc, removed] = removeEmojiChars(parenDesc);
        removedThisLine += removed;
        return `]${separator}(${newDesc})`;
      }
      return match;
    });

    totalRemoved += removedThisLine;
    return modifiedLine;
  });

  return [newLines, totalRemoved];
}

function removeEmojiFromReadme({ dryRun = true, backup = true } = {}) {
  const originalLines = fs.readFileSync('README.md', 'utf8').split(/(?<=\n)/);
  if (originalLines.at(-1) === '') originalLines.pop();
  const [newLines, removed] = removeEmojiFromLines(originalLines);

  if (removed && !dryRun) {
    if (backup) fs.writeFileSync('README.md.bak', originalLines.join(''), 'utf8');
    fs.writeFileSync('README.md', newLines.join(''), 'utf8');
  }

  return dryRun ? [removed, originalLines, newLines] : [removed, null, newLines];
}

function removeDuplicateUrls(lines) {
  const seenUrls = new Set();
  const output = [];
  let removed = 0;

  for (const line of lines) {
    const match = line.match(/\(([^)]+)\)/);
    if (match) {
      const normalized = normalizeUrl(match[1]);
      if (seenUrls.has(normalized)) {
        removed += 1;
        continue;
      }
      seenUrls.add(normalized);
    }
    output.push(line);
  }

  return [output, removed];
}

function removeExactDuplicateLinks(lines) {
  const bracketPattern = /\[([^\]]*?)]/;
  const parenPattern = /\(([^)]+)\)/;
  const result = [];
  let removed = 0;
  let index = 0;

  while (index < lines.length) {
    let line = lines[index];
    let nextIndex = index + 1;
    const textMatch = line.match(bracketPattern);
    const urlMatch = line.match(parenPattern);

    if (textMatch && urlMatch) {
      const text = textMatch[1].trimEnd();
      if (text !== textMatch[1]) line = line.replace(bracketPattern, `[${text}]`);
      const url = normalizeUrl(urlMatch[1]);

      while (nextIndex < lines.length) {
        const nextTextMatch = lines[nextIndex].match(bracketPattern);
        const nextUrlMatch = lines[nextIndex].match(parenPattern);
        if (!nextTextMatch || !nextUrlMatch) break;
        if (nextTextMatch[1].trimEnd() === text && normalizeUrl(nextUrlMatch[1]) === url) {
          removed += 1;
          nextIndex += 1;
          continue;
        }
        break;
      }
    }

    result.push(line);
    index = nextIndex;
  }

  return [result, removed];
}

function extractPortfolioData(lines) {
  const pattern = /^-\s+\[([^\]]+)]\(([^)]+)\)(?:\s+\[([^\]]*)])?/;
  const portfolios = [];

  for (const line of lines) {
    const match = line.trim().match(pattern);
    if (!match) continue;
    const entry = {
      name: match[1].trim(),
      url: match[2].trim(),
    };
    const tagline = match[3] ? match[3].trim() : null;
    if (tagline) entry.tagline = tagline;
    portfolios.push(entry);
  }

  return portfolios;
}

function createFeedJson(readmePath = 'README.md', outputPath = 'feed.json') {
  try {
    const lines = fs.readFileSync(readmePath, 'utf8').split(/\r?\n/).map((line, index, array) => {
      return index < array.length - 1 ? `${line}\n` : line;
    });
    const portfolios = extractPortfolioData(lines);
    fs.writeFileSync(outputPath, `${JSON.stringify(portfolios, null, 2)}\n`, 'utf8');
    return portfolios.length;
  } catch (error) {
    console.error(`Error creating feed.json: ${error.message}`);
    return 0;
  }
}

function main() {
  const originalLines = fs.readFileSync('README.md', 'utf8').split(/(?<=\n)/);
  if (originalLines.at(-1) === '') originalLines.pop();

  try {
    fs.writeFileSync('README.md.bak', originalLines.join(''), 'utf8');
  } catch (_error) {
    // Backup is helpful, but the cleanup can continue if it fails.
  }

  const titleCaseNames = originalLines.map(convertToTitleCase);
  const trimmedLines = titleCaseNames.map((line) => line.replace(/\[([^\]]*?)\s+]/g, '[$1]'));

  const normalizeDescription = (_match, prefix, inside, suffix) => {
    return `${prefix}${inside.replace(/\bfull(?:[\W_]*?)stack\b/gi, 'Full Stack')}${suffix}`;
  };

  let normalizedLines = trimmedLines.map((line) => line.replace(/(\)\s*\[)([^\]]*?)(])/g, normalizeDescription));
  normalizedLines = normalizedLines.map((line) => line.replace(/(\)\s*\()([^)]+?)(\))/g, normalizeDescription));
  const cleanedBracketLines = normalizedLines.map((line) => line.replace(/\[\s+([^\]]*?)\s+]/g, '[$1]'));

  const [urlDedupedLines, urlRemoved] = removeDuplicateUrls(cleanedBracketLines);
  if (urlRemoved) console.log(`Removed ${urlRemoved} duplicate URL line(s) from README.md (kept first occurrences).`);

  const seen = new Set();
  const dedupedLines = [];
  let duplicatesRemoved = 0;
  for (const line of urlDedupedLines) {
    if (line == null || line.trim() === '') {
      dedupedLines.push(line);
      continue;
    }
    const key = line.trimEnd();
    if (seen.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(key);
    dedupedLines.push(line);
  }
  if (duplicatesRemoved) console.log(`Removed ${duplicatesRemoved} duplicate line(s) from README.md (kept first occurrences).`);

  const [reorganizedLines, movedCount] = validateSectionPlacement(dedupedLines);
  if (movedCount) console.log(`Moved ${movedCount} misplaced ${movedCount === 1 ? 'entry' : 'entries'} to correct alphabetical section(s).`);

  const [sortedLines] = sortListsAlphabetically(reorganizedLines);
  const [finalLines, postRemoved] = removeExactDuplicateLinks(sortedLines);
  if (postRemoved) console.log(`Removed ${postRemoved} adjacent exact duplicate link(s) after sorting.`);

  fs.writeFileSync('README.md', finalLines.join(''), 'utf8');
  const portfolioCount = createFeedJson();
  if (portfolioCount) console.log(`Created feed.json with ${portfolioCount} portfolio entries.`);
}

module.exports = {
  convertToTitleCase,
  createFeedJson,
  emojiAdjacentToLink,
  extractPortfolioData,
  findDuplicateLines,
  hasEmoji,
  linkTextHasEmoji,
  main,
  normalizeUrl,
  removeDuplicateUrls,
  removeEmojiChars,
  removeEmojiFromLines,
  removeEmojiFromReadme,
  removeExactDuplicateLinks,
  sortListsAlphabetically,
  validateSectionPlacement,
};

if (require.main === module) {
  main();
}
