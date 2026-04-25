const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

const fontPath = path.join(__dirname, 'node_modules', '@fontsource', 'noto-serif-jp/files/noto-serif-jp-japanese-400-normal.woff');
try {
  GlobalFonts.registerFromPath(fontPath, 'NotoSerifJP');
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
    date: `${month}/${day}`,
    time: `${hour}:${minute}`,
    name: nameMatch[1],
  };
}

// =============================
// 画像生成
// =============================
function generateWelcomeImage({ date, time, name }) {
  const W = 1920, H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const serif = 'NotoSerifJP';

  // 背景
  ctx.fillStyle = '#F7F5F0';
  ctx.fillRect(0, 0, W, H);

  // 外枠
  ctx.strokeStyle = '#C8BEA8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(68, 68, W - 136, H - 136);

  // 内枠
  ctx.strokeStyle = '#E0D8C8';
  ctx.lineWidth = 1;
  ctx.strokeRect(90, 90, W - 180, H - 180);

  // WELCOME
  ctx.font = `400 80px "${serif}"`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#A89878';
  ctx.fillText('WELCOME', W / 2, 362);

  // WELCOMEの下ライン
  ctx.fillStyle = '#C8BEA8';
  ctx.fillRect(W / 2 - 196, 388, 392, 1.5);

  // 日付・時間
  ctx.font = `400 56px "${serif}"`;
  ctx.fillStyle = '#7A6E60';
  ctx.fillText(`${date}　${time}`, W / 2, 524);

  // 名前
  ctx.font = `400 110px "${serif}"`;
  ctx.fillStyle = '#221E18';
  ctx.fillText(name, W / 2, 730);

  // 名前の下ライン（余裕を持たせる）
  ctx.fillStyle = '#C8BEA8';
  ctx.fillRect(W / 2 - 196, 824, 392, 1.5);

  // 社名
  ctx.font = `400 40px "${serif}"`;
  ctx.fillStyle = '#A89878';
  ctx.fillText('KOMAI HOME', W / 2, 916);

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
    await message.reply({ files: [attachment] });
    await message.delete();
  } catch (err) {
    console.error(err);
    await message.reply('❌ 画像生成中にエラーが発生しました');
  }
});

client.login(process.env.DISCORD_TOKEN);
