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
  const rawTitle = titleMatch ? titleMatch[1].trim() : '机场社区 - 2026 稳定节点评测与跑路预警';
  const cleanTitle = rawTitle.replace(/\s*[-|_|\|]\s*机场社区.*$/i, '').trim();

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

  // 2. 检查并补充 RSS 订阅源声明
  if (!content.includes('type="application/rss+xml"') && !content.includes("type='application/rss+xml'")) {
    const rssTag = `\n  <link rel="alternate" type="application/rss+xml" title="机场社区 RSS 订阅" href="${DOMAIN}/rss.xml">`;
    content = content.replace(/(<link\s+rel=["']canonical["'][^>]*>)/i, `$1${rssTag}`);
    if (!content.includes(rssTag)) {
      content = content.replace(/<head>/i, `<head>${rssTag}`);
    }
    modified = true;
    console.log(`[RSS] 添加订阅声明: ${relativePath}`);
  }

  // 3. 检查并补充文章 Schema.org JSON-LD (TechArticle + BreadcrumbList)
  if (relativePath.startsWith('articles/')) {
    const articleId = `${canonicalUrl}#article`;
    const breadcrumbId = `${canonicalUrl}#breadcrumb`;

    if (!content.includes('application/ld+json')) {
      const jsonLd = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": "${articleId}",
        "headline": ${JSON.stringify(cleanTitle)},
        "description": ${JSON.stringify(description)},
        "inLanguage": "zh-CN",
        "datePublished": "2026-10-10T12:00:00+08:00",
        "dateModified": "2026-10-15T12:00:00+08:00",
        "author": {
          "@type": "Person",
          "name": "机场社区网络架构与安全团队",
          "url": "${DOMAIN}/about.html"
        },
        "publisher": {
          "@type": "Organization",
          "name": "机场社区",
          "logo": {
            "@type": "ImageObject",
            "url": "${DOMAIN}/images/logo.png"
          }
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "${breadcrumbId}",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "首页",
            "item": "${DOMAIN}/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "技术专栏",
            "item": "${DOMAIN}/blog.html"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": ${JSON.stringify(cleanTitle)},
            "item": "${canonicalUrl}"
          }
        ]
      }
    ]
  }
  </script>`;

      content = content.replace(/<\/head>/i, `${jsonLd}\n</head>`);
      modified = true;
      console.log(`[Schema.org] 为文章注入 TechArticle + BreadcrumbList: ${relativePath}`);
    } else if (!content.includes('BreadcrumbList')) {
      // 已有 ld+json 但无 BreadcrumbList，则在现有 graph 内补充
      const breadcrumbObj = {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "首页",
            "item": `${DOMAIN}/`
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "技术专栏",
            "item": `${DOMAIN}/blog.html`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": cleanTitle,
            "item": canonicalUrl
          }
        ]
      };
      const breadcrumbStr = JSON.stringify(breadcrumbObj, null, 6).replace(/^/gm, '      ').trim();
      content = content.replace(/("@graph"\s*:\s*\[[\s\S]*?)(\n\s*\])/i, (m, p1, p2) => {
        return `${p1.trimEnd()},\n      ${breadcrumbStr}${p2}`;
      });
      modified = true;
      console.log(`[Schema.org] 补充 BreadcrumbList: ${relativePath}`);
    }
  }

  // 4. 检查并补充 Open Graph & Twitter Card
  if (!content.includes('property="og:title"') && !content.includes('property=\'og:title\'')) {
    const ogTags = `
  <!-- Open Graph / Facebook / Telegram Meta Tags -->
  <meta property="og:type" content="${relativePath.startsWith('articles/') ? 'article' : 'website'}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${rawTitle.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${defaultOgImage}">
  <meta property="og:site_name" content="机场社区">

  <!-- Twitter Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${rawTitle.replace(/"/g, '&quot;')}">
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
console.log(`共发现 ${htmlFiles.length} 个 HTML 页面，开始规范化处理...`);
htmlFiles.forEach(processHtmlFile);
console.log('✅ 所有 HTML 规范化处理完成！');
