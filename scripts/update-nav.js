const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const rootFiles = [
  'index.html',
  'best-value.html',
  'compare.html',
  'faq.html',
  'blog.html',
  'about.html',
  'privacy.html',
  'terms.html'
];

const alertFiles = [
  'alerts/index.html',
  'alerts/sufengyun-status.html'
];

const articleFiles = fs.readdirSync(path.join(ROOT_DIR, 'articles'))
  .filter(f => f.endsWith('.html'))
  .map(f => path.join('articles', f));

function updateFile(relPath, isRoot) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn('File not found:', fullPath);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if 机场评测 is already in nav
  if (content.includes('机场评测</a>')) {
    console.log('[SKIP] Already has 机场评测:', relPath);
    return;
  }

  const link = isRoot ? 'reviews.html' : '../reviews.html';
  const navItem = `          <li class="nav-item"><a href="${link}" class="nav-link">机场评测</a></li>`;

  let updated = false;

  // Case 1: Replace old "机场库" link if present
  if (content.includes('#speed-table') && content.includes('机场库</a>')) {
    content = content.replace(
      /[ \t]*<li class="nav-item"><a href="[^"]*#speed-table"[^>]*>机场库<\/a><\/li>/g,
      navItem
    );
    updated = true;
  }

  // Case 2: In articles/2026-airport-recommendation.html or similar, check if #speed-table was replaced
  if (!updated) {
    // Find compare.html item in nav and insert reviews.html after it
    const compareRegex = /(<li class="nav-item(?: [^"]*)?"><a href="[^"]*compare\.html" class="nav-link">机场对比<\/a><\/li>)(\r?\n\s*)/;
    if (compareRegex.test(content)) {
      content = content.replace(compareRegex, (match, p1, p2) => {
        return `${p1}\r\n${navItem}\r\n`;
      });
      // Clean up potential duplicate blank lines before faq
      content = content.replace(/(\r?\n\s*){3,}(<li class="nav-item)/g, '\r\n          $2');
      updated = true;
    }
  }

  // Also modernize warning link in about/terms/privacy to alerts/index.html if it points to art-04
  if (isRoot && content.includes('articles/art-04-jichang-bikeng.html') && content.includes('跑路预警</a>')) {
    content = content.replace('articles/art-04-jichang-bikeng.html', 'alerts/index.html');
  }

  if (updated) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('[UPDATED]:', relPath);
  } else {
    console.warn('[FAILED TO MATCH]:', relPath);
  }
}

console.log('--- Updating Root HTML Files ---');
rootFiles.forEach(f => updateFile(f, true));

console.log('--- Updating Alerts HTML Files ---');
alertFiles.forEach(f => updateFile(f, false));

console.log('--- Updating Articles HTML Files ---');
articleFiles.forEach(f => updateFile(f, false));

console.log('All done!');
