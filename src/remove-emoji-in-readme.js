const {
  removeEmojiFromReadme,
} = require('./alphabetical');

function main(argv = process.argv.slice(2)) {
  const apply = argv.includes('--apply');
  const noBackup = argv.includes('--no-backup');
  const [removed, originalLines, newLines] = removeEmojiFromReadme({
    dryRun: !apply,
    backup: !noBackup,
  });

  if (removed === 0) {
    console.log('No emoji found in link text/adjacent descriptions in README.md');
    return 0;
  }

  console.log(`Removed ${removed} emoji character(s) from README.md`);
  if (originalLines && newLines) {
    originalLines.forEach((line, index) => {
      if (line !== newLines[index]) {
        console.log(`Line ${index + 1}:`);
        console.log(`  - ${line.trimEnd()}`);
        console.log(`  + ${newLines[index].trimEnd()}`);
      }
    });
  }

  if (apply) console.log('Applied changes to README.md');
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { main };
