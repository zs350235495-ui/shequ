const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://jichangshequ.com';
const ARTICLES_DIR = path.join(__dirname, '../articles');
const RSS_OUTPUT_PATH = path.join(__dirname, '../rss.xml');

function escapeXml(unsafe) {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRss() {
  const files = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.html'))
    .sort();

  const items = [];

  files.forEach(file => {
    const filePath = path.join(ARTICLES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : file;
    // 去除标题后缀
    title = title.replace(/\s*[-|_|\|]\s*机场社区.*$/i, '').trim();

    const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    const description = descMatch ? descMatch[1].trim() : title;

    const url = `${DOMAIN}/articles/${file}`;

    // 默认或从文件提取时间
    let pubDate = new Date('2026-10-15T00:00:00+08:00').toUTCString();
    const dateMatch = content.match(/["']datePublished["']\s*:\s*["']([^"']+)["']/i);
    if (dateMatch) {
      pubDate = new Date(dateMatch[1]).toUTCString();
    } else {
      // 提取正文发布时间如 "2026-10-xx"
      const textDateMatch = content.match(/2026-\d{2}-\d{2}/);
      if (textDateMatch) {
        pubDate = new Date(textDateMatch[0] + 'T00:00:00+08:00').toUTCString();
      }
    }

    items.push({
      title,
      link: url,
      guid: url,
      description,
      pubDate
    });
  });

  const nowUTC = new Date().toUTCString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
  xml += `  <channel>\n`;
  xml += `    <title>机场社区 (jichangshequ.com) - 跨境网络基础设施与节点稳定性众测知识库</title>\n`;
  xml += `    <link>${DOMAIN}/</link>\n`;
  xml += `    <description>机场社区致力于构建公开、透明的网络节点稳定性众测与跨平台使用经验交流平台。聚焦突发阻断预警、晚高峰丢包众包反馈、工单响应 SLA 审计与避坑防跑路指南。</description>\n`;
  xml += `    <language>zh-cn</language>\n`;
  xml += `    <lastBuildDate>${nowUTC}</lastBuildDate>\n`;
  xml += `    <atom:link href="${DOMAIN}/rss.xml" rel="self" type="application/rss+xml"/>\n`;

  items.forEach(item => {
    xml += `    <item>\n`;
    xml += `      <title>${escapeXml(item.title)}</title>\n`;
    xml += `      <link>${item.link}</link>\n`;
    xml += `      <guid isPermaLink="true">${item.guid}</guid>\n`;
    xml += `      <pubDate>${item.pubDate}</pubDate>\n`;
    xml += `      <description><![CDATA[${item.description}]]></description>\n`;
    xml += `    </item>\n`;
  });

  xml += `  </channel>\n`;
  xml += `</rss>\n`;

  fs.writeFileSync(RSS_OUTPUT_PATH, xml, 'utf-8');
  console.log(`✅ 成功生成 rss.xml，包含 ${items.length} 篇核心文章`);
}

buildRss();
