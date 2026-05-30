const http = require('http');
const { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require('path');

// ==============================
// フォント登録
// ==============================
const fontBase = path.join(__dirname, 'node_modules', '@fontsource', 'noto-sans-jp', 'files');
try {
  GlobalFonts.registerFromPath(path.join(fontBase, 'noto-sans-jp-japanese-900-normal.woff'), 'NotoSansJP-Black');
  GlobalFonts.registerFromPath(path.join(fontBase, 'noto-sans-jp-japanese-100-normal.woff'), 'NotoSansJP-Thin');
  
  console.log('✅ フォント読み込み成功');
} catch (e) {
  console.warn('⚠️ フォント読み込み失敗:', e.message);
}

// ==============================
// 設定
// ==============================
const COMPANY_NAME = '- KOMAI HOME -';
const NOTIFY_ROLE_ID = '1496147336043298866';
const BG_OPACITY = 0.3;
const WELCOME_MESSAGE = 'ご来場お待ちしておりました。\n担当スタッフがすぐにご案内いたします。';

// ==============================
// Discord
// ==============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ==============================
// テキストパース
// ==============================
function parseVisitorMessage(text) {
  const normalized = text
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[／]/g, '/')
    .replace(/[：]/g, ':')
    .replace(/　/g, ' ')
    .trim();

  const dateMatch = normalized.match(/(\d{1,2})[\/月](\d{1,2})(?:日)?/);
  const timeMatch = normalized.match(/(\d{1,2}):(\d{2})|(\d{1,2})時(\d{2})?(?:分)?/);
  const nameMatch = normalized.match(/([^\s\d:/月日時分]+(?:様|さん))/);

  if (!dateMatch || !nameMatch) return null;

  const month = parseInt(dateMatch[1]);
  const day   = parseInt(dateMatch[2]);

  let hour = '00', minute = '00';
  if (timeMatch) {
    if (timeMatch[1] !== undefined) {
      hour   = timeMatch[1].padStart(2, '0');
      minute = timeMatch[2].padStart(2, '0');
    } else {
      hour   = timeMatch[3].padStart(2, '0');
      minute = (timeMatch[4] || '00').padStart(2, '0');
    }
  }

  return {
    date: `${month}/${day}`,
    time: `${hour}:${minute}`,
    name: nameMatch[1],
  };
}

// ==============================
// 画像生成（高解像度 + シャープ化）
// ==============================
async function generateWelcomeImage({ date, time, name }, W = 1920, H = 1080) {
  const SCALE = 2; // ★解像度アップ（重要）

  const canvas = createCanvas(W * SCALE, H * SCALE);
  const ctx = canvas.getContext('2d');

  ctx.scale(SCALE, SCALE);

  // ★描画品質向上
  ctx.antialias = 'subpixel';
  ctx.patternQuality = 'best';
  ctx.quality = 'best';
  ctx.textDrawingMode = 'path';

  const BLACK = 'NotoSansJP-Black';
  const THIN  = 'NotoSansJP-Thin';

  const pt = v => Math.round(v * 96 / 72);

  const centerX = Math.round(W / 2);

  // 背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // 外枠
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    Math.round(W * 0.021),
    Math.round(H * 0.037),
    Math.round(W * 0.958),
    Math.round(H * 0.926)
  );

  // 内枠
  ctx.strokeStyle = '#E8E8E8';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    Math.round(W * 0.029),
    Math.round(H * 0.052),
    Math.round(W * 0.942),
    Math.round(H * 0.896)
  );

  // 背景画像
  try {
    const bgImg = await loadImage(path.join(__dirname, 'bg.png'));
    ctx.globalAlpha = BG_OPACITY;
    ctx.drawImage(bgImg, 0, 0, W, H);
    ctx.globalAlpha = 1.0;
  } catch (e) {
    console.warn('bg.png読み込みスキップ:', e.message);
  }

  ctx.textAlign = 'center';

  // Welcome
  const wSize = pt(80);
  ctx.font = `900 ${wSize}px "${BLACK}"`;

  ctx.fillStyle = 'rgba(64,64,64,0.50)';
  ctx.fillText('Welcome', centerX + 6, Math.round(310));

  ctx.fillStyle = 'rgba(64,64,64,0.50)';
  ctx.fillText('Welcome', centerX, Math.round(310));

  // 日付時間
  ctx.font = `100 ${pt(32)}px "${THIN}"`;
  ctx.fillStyle = '#404040';
  ctx.fillText(`${date}　${time}`, centerX, Math.round(430));

  // 名前
  ctx.font = `100 ${pt(52)}px "${THIN}"`;
  ctx.fillText(name, centerX, Math.round(540));

  // メッセージ
  ctx.font = `100 ${pt(24)}px "${THIN}"`;
  const lines = WELCOME_MESSAGE.split('\n');
  const lineH = pt(16) * 1.9;
  const msgStartY = 670;

  lines.forEach((line, i) => {
    ctx.fillText(line, centerX, Math.round(msgStartY + i * lineH));
  });

  // フッター
  ctx.font = `100 ${pt(16)}px "${THIN}"`;
  ctx.fillStyle = '#BFBFBF';
  ctx.fillText(COMPANY_NAME, centerX, Math.round(980));

  // ★ JPG出力（高品質）
  return canvas.toBuffer('image/jpeg', {
    quality: 1.0,
  });
}

// ==============================
// Discordイベント
// ==============================
client.once('ready', () => {
  console.log(`✅ Bot起動: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const hasDAndName =
    /[\d０-９]{1,2}[\/／月][\d０-９]{1,2}/.test(message.content) &&
    /様|さん/.test(message.content);

  if (!hasDAndName) return;

  const parsed = parseVisitorMessage(message.content);
  if (!parsed) {
    await message.reply('⚠️ 形式を認識できませんでした。例: `4/25 10:00 斉藤様`');
    return;
  }

  try {
    const buffer = await generateWelcomeImage(parsed, 1920, 1080);
    const file = new AttachmentBuilder(buffer, { name: 'welcome.jpg' });

    const member = message.member;
    const roleColor = member?.roles?.color?.hexColor ?? '#808080';

    const embed = new EmbedBuilder()
      .setColor(roleColor)
      .setDescription(
        `<@${message.author.id}> !\n` +
        `${parsed.date.replace('/', '月')}日 ${parsed.time.replace(':', '時')}分 ${parsed.name}のウェルカムを作成したよ！\n\n` +
        `<@&${NOTIFY_ROLE_ID}> みんなにも共有しておくね！`
      )
      .setImage('attachment://welcome.jpg');

    await message.reply({
      embeds: [embed],
      files: [file],
    });

  } catch (err) {
    console.error(err);
    await message.reply('❌ 画像生成中にエラーが発生しました');
  }
});

// ダミーHTTPサーバー（Render無料枠用）
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
}).listen(PORT, () => {
  console.log(`✅ HTTPサーバー起動: port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
