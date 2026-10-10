const HOST = 'jichangshequ.com';
const INDEXNOW_KEY = '5a4d3f2e1c0b9a8f7e6d5c4b3a2f1e0d';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

const urlsToSubmit = [
  `https://${HOST}/index.html`,
  `https://${HOST}/blog.html`,
  `https://${HOST}/alerts/index.html`,
  `https://${HOST}/alerts/sufengyun-status.html`,
  `https://${HOST}/articles/art-42-2026-wending-jichang-tuijian.html`
];

async function sendIndexNow() {
  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlsToSubmit
  };

  try {
    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log('✅ IndexNow API 批量 URLs 推送成功！Status:', response.status);
    } else {
      console.error('❌ IndexNow 推送状态:', response.status, await response.text());
    }
  } catch (err) {
    console.error('❌ IndexNow 提交请求错误:', err.message);
  }
}

sendIndexNow();
