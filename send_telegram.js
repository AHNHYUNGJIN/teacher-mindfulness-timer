const https = require('https');

const botToken = process.env.TELEGRAM_BOT_TOKEN || process.argv[2];
const chatId = process.env.TELEGRAM_CHAT_ID || process.argv[3];

if (!botToken || !chatId) {
  console.error('사용법: node send_telegram.js <BOT_TOKEN> <CHAT_ID> [MESSAGE]');
  console.error('또는 환경 변수 TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID 설정 후 실행');
  process.exit(1);
}

const defaultMessage = `🌱 [교사용 마음챙김 & 일과 관리 타이머 배포 알림]

✨ GitHub 저장소:
https://github.com/AHNHYUNGJIN/teacher-mindfulness-timer

🚀 Vercel 배포 사이트:
https://teacher-mindfulness-timer.vercel.app

교직 현장에 맞춘 3분 호흡, 수업 타이머, 나이스/공문 할일 관리 기능을 브라우저에서 바로 사용하실 수 있습니다!`;

const messageText = process.argv[4] || defaultMessage;

const payload = JSON.stringify({
  chat_id: chatId,
  text: messageText,
  parse_mode: 'HTML'
});

const req = https.request({
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${botToken}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const resp = JSON.parse(body);
      if (resp.ok) {
        console.log('✅ 텔레그램 메시지 전송 성공!');
      } else {
        console.error('❌ 텔레그램 전송 실패:', resp.description);
      }
    } catch (e) {
      console.log('응답 수신:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('요청 오류:', e.message);
});

req.write(payload);
req.end();
