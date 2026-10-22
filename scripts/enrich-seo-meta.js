const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://jichangshequ.com';
const ROOT_DIR = path.resolve(__dirname, '..');

// 递归查找所有 html 文件
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== '.git' && file !== 'node_modules' && file !== 'go') {
        results = results.concat(getHtmlFiles(fullPath));
      }
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  });
  return results;
}

function processHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

  // 处理 404.html
  if (relativePath === '404.html') {
    if (!content.includes('name="robots"')) {
      content = content.replace(/<head>/i, '<head>\n  <meta name="robots" content="noindex, nofollow">');
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`[404] 补充 noindex 标签: ${relativePath}`);
    }
    return;
  }

  // 计算标准规范 URL
  let canonicalUrl = `${DOMAIN}/${relativePath}`;
  if (relativePath === 'index.html') {
    canonicalUrl = `${DOMAIN}/`;
  }

  // 提取 title
  const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '机场社区 - 2026 稳定节点评测与跑路预警';

  // 提取 description
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const description = descMatch ? descMatch[1].trim() : '机场社区：2026 稳定网络节点评测、晚高峰延迟与丢包实测，跑路避坑预警。';

  const defaultOgImage = `${DOMAIN}/images/logo.png`;

  let headEndMatch = content.match(/<\/head>/i);
  if (!headEndMatch) return;

  let modified = false;

  // 1. 检查并补充 / 纠正 canonical
  const canonicalMatch = content.match(/<link\s+rel=["']canonical["'][^>]*>/i);
  if (!canonicalMatch) {
    // 插入在 title 或 head 开头之后
    const canonicalTag = `\n  <link rel="canonical" href="${canonicalUrl}">`;
    content = content.replace(/(<meta\s+name=["']description["'][^>]*>)/i, `$1${canonicalTag}`);
    if (!content.includes(canonicalTag)) {
      content = content.replace(/<head>/i, `<head>${canonicalTag}`);
    }
    modified = true;
    console.log(`[Canonical] 添加: ${relativePath} -> ${canonicalUrl}`);
  } else if (relativePath === 'index.html' && canonicalMatch[0].includes('index.html')) {
    content = content.replace(canonicalMatch[0], `<link rel="canonical" href="${DOMAIN}/">`);
    modified = true;
    console.log(`[Canonical] 纠正 index.html: ${DOMAIN}/`);
  }

  // 2. 检查并补充 Open Graph & Twitter Card
  if (!content.includes('property="og:title"') && !content.includes('property=\'og:title\'')) {
    const ogTags = `
  <!-- Open Graph / Facebook / Telegram Meta Tags -->
  <meta property="og:type" content="${relativePath.startsWith('articles/') ? 'article' : 'website'}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${defaultOgImage}">
  <meta property="og:site_name" content="机场社区">

  <!-- Twitter Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${defaultOgImage}">`;

    // 插入到 </head> 之前
    content = content.replace(/<\/head>/i, `${ogTags}\n</head>`);
    modified = true;
    console.log(`[OG Tags] 添加社交标签: ${relativePath}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

const htmlFiles = getHtmlFiles(ROOT_DIR);
console.log(`共发现 ${htmlFiles.length} 个 HTML 页面，开始处理...`);
htmlFiles.forEach(processHtmlFile);
console.log('✅ 所有 HTML 规范化处理完成！');
