const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://jichangshequ.com';
const ALERTS_JSON_PATH = path.join(__dirname, '../data/alerts.json');
const SITEMAP_ALERTS_PATH = path.join(__dirname, '../sitemap-alerts.xml');
const MAIN_SITEMAP_PATH = path.join(__dirname, '../sitemap.xml');

function buildAlertsSitemap() {
  if (!fs.existsSync(ALERTS_JSON_PATH)) {
    console.error('❌ 找不到 alerts.json 数据源');
    return;
  }

  const alertsData = JSON.parse(fs.readFileSync(ALERTS_JSON_PATH, 'utf-8'));
  const nowISO = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  xml += `  <url>\n`;
  xml += `    <loc>${DOMAIN}/alerts/index.html</loc>\n`;
  xml += `    <lastmod>${nowISO}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>0.9</priority>\n`;
  xml += `  </url>\n`;

  let includedCount = 1;
  alertsData.forEach(item => {
    const pagePath = path.join(__dirname, `../alerts/${item.slug}.html`);
    if (!fs.existsSync(pagePath)) {
      console.warn(`⚠️ 跳过不存在的预警详情页: alerts/${item.slug}.html (避免产生404死链)`);
      return;
    }
    const lastMod = item.lastCheckDate || item.reportedDate || nowISO;
    xml += `  <url>\n`;
    xml += `    <loc>${DOMAIN}/alerts/${item.slug}.html</loc>\n`;
    xml += `    <lastmod>${new Date(lastMod).toISOString()}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
    includedCount++;
  });

  xml += `</urlset>`;

  fs.writeFileSync(SITEMAP_ALERTS_PATH, xml, 'utf-8');
  console.log(`✅ 已成功生成 sitemap-alerts.xml，包含 ${includedCount} 条真实有效 URLs`);
}

buildAlertsSitemap();
