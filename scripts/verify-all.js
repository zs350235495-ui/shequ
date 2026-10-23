const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function getAllHtml(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== '.git' && f !== 'node_modules') res.push(...getAllHtml(full));
    } else if (f.endsWith('.html')) {
      res.push(full);
    }
  }
  return res;
}

const htmlFiles = getAllHtml(root);
console.log(`🔍 共扫描 HTML 页面数量: ${htmlFiles.length}`);

const deadLinks = [];
let validJsonLdCount = 0;
let jsonLdErrors = [];
let rssDeclaredCount = 0;

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);

  // 1. 检查 RSS 声明
  if (content.includes('type="application/rss+xml"') || content.includes("type='application/rss+xml'")) {
    rssDeclaredCount++;
  }

  // 2. 检查内链
  const regex = /href=["']([^"'#:]+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const target = match[1];
    if (
      target.startsWith('http') ||
      target.startsWith('javascript:') ||
      target.startsWith('mailto:') ||
      target.startsWith('tel:')
    ) {
      continue;
    }
    let resolved = target.startsWith('/') ? path.join(root, target) : path.join(dir, target);
    resolved = resolved.split('?')[0].split('#')[0];
    if (!fs.existsSync(resolved)) {
      deadLinks.push({
        file: path.relative(root, file),
        target,
        resolved: path.relative(root, resolved)
      });
    }
  }

  // 3. 检查 JSON-LD 语法合法性
  const ldMatches = [...content.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      JSON.parse(m[1]);
      validJsonLdCount++;
    } catch (e) {
      jsonLdErrors.push({ file: path.relative(root, file), error: e.message });
    }
  }
}

console.log(`✅ 包含 RSS 订阅源声明的页面: ${rssDeclaredCount} / ${htmlFiles.length}`);
console.log(`✅ 经语法验证通过的 JSON-LD 结构化数据块: ${validJsonLdCount}`);
console.log(`❌ JSON-LD 语法解析错误数: ${jsonLdErrors.length}`);
if (jsonLdErrors.length > 0) {
  console.error('JSON-LD 解析异常:', jsonLdErrors);
}

console.log(`❌ 全站死链/404 数量: ${deadLinks.length}`);
if (deadLinks.length > 0) {
  console.error('死链详情:', deadLinks);
  process.exit(1);
} else {
  console.log('🎉 验证全部通过！全站 0 死链，0 个 404！');
}
