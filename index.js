const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Noto Sans JP フォント登録
const fontPath = path.join(__dirname, 'node_modules', '@fontsource', 'noto-sans-jp', 'files', 'noto-sans-jp-japanese-400-normal.woff');
try {
  GlobalFonts.registerFromPath(fontPath, 'NotoSansJP');
  console.log('✅ フォント読み込み成功');
} catch (e) {
  console.warn('⚠️ フォント読み込み失敗:', e.message);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// =============================
// テキストパース
// =============================
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
    date: `${month}月${day}日`,
    time: `${hour}:${minute}`,
    name: nameMatch[1],
  };
}

// =============================
// 画像生成（シンプル・ライト）
// =============================
function generateWelcomeImage({ date, time, name }) {
  const W = 1920, H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const font = 'NotoSansJP';

  // 背景（オフホワイト）
  ctx.fillStyle = '#f5f5f3';
  ctx.fillRect(0, 0, W, H);

  // 細いボーダー
  ctx.strokeStyle = '#ccccc8';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  // WELCOME
  ctx.font = `300 52px "${font}"`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9a9a94';
  ctx.fillText('WELCOME', W / 2, 320);

  // 区切り線
  ctx.fillStyle = '#d8d8d4';
  ctx.fillRect(W / 2 - 240, 355, 480, 1);

  // 日付・時間
  ctx.font = `300 44px "${font}"`;
  ctx.fillStyle = '#7a7a74';
  ctx.fillText(`${date}　${time}`, W / 2, 450);

  // お名前（メイン）
  ctx.font = `300 140px "${font}"`;
  ctx.fillStyle = '#2a2a28';
  ctx.fillText(name, W / 2, 660);

  // 区切り線（下）
  ctx.fillStyle = '#d8d8d4';
  ctx.fillRect(W / 2 - 240, 710, 480, 1);

  // 社名
  ctx.font = `300 32px "${font}"`;
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText('YOUR COMPANY NAME', W / 2, 800);

  return canvas.toBuffer('image/png');
}

// =============================
// Discord イベント
// =============================
client.once('ready', () => {
  console.log(`✅ Bot起動: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const hasDAndName = /[\d０-９]{1,2}[\/／月][\d０-９]{1,2}/.test(message.content)
    && /様|さん/.test(message.content);
  if (!hasDAndName) return;

  const parsed = parseVisitorMessage(message.content);
  if (!parsed) {
    await message.reply('⚠️ 形式を認識できませんでした。例: `4/25 10:00 斉藤様`');
    return;
  }

  try {
    const imgBuffer = generateWelcomeImage(parsed);
    const attachment = new AttachmentBuilder(imgBuffer, { name: 'welcome.png' });
    await message.reply({
      content: `📋 ${parsed.date} ${parsed.time} ${parsed.name} の来場画像を生成しました`,
      files: [attachment],
    });
  } catch (err) {
    console.error(err);
    await message.reply('❌ 画像生成中にエラーが発生しました');
  }
});

client.login(process.env.DISCORD_TOKEN);
