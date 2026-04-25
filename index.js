const { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const { loadImage } = require('@napi-rs/canvas');

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
// カスタマイズ設定
// ==============================
const COMPANY_NAME = '- KOMAI HOME -';
const NOTIFY_ROLE_ID = '1496147336043298866';
const BG_OPACITY = 0.08; // 背景画像の透過度（0.0〜1.0）
const WELCOME_MESSAGE = 'ご来場お待ちしておりました。\n担当スタッフがすぐにご案内いたします。';

// ==============================
// Discord クライアント
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
// 画像生成
// ==============================
async function generateWelcomeImage({ date, time, name }) {
  // 96dpiで60pt = 80px、16pt = 21px、44pt = 59px
  const W = 960, H = 540;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const BLACK = 'NotoSansJP-Black';
  const THIN  = 'NotoSansJP-Thin';

  // px換算（1pt = 96/72px）
  const pt = v => Math.round(v * 96 / 72);

  // 背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // 外枠
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // 内枠
  ctx.strokeStyle = '#E8E8E8';
  ctx.lineWidth = 1;
  ctx.strokeRect(56, 56, W - 112, H - 112);

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

  // --- WELCOME（Black × 2枚重ね、50%透過）---
  const wSize = pt(80);
  ctx.font = `900 ${wSize}px "${BLACK}"`;

  // 1枚目（薄め）
  ctx.fillStyle = 'rgba(64, 64, 64, 0.50)';
  ctx.fillText('Welcome', W / 2 + 6, 310);

  // 2枚目（通常）
  ctx.fillStyle = 'rgba(64, 64, 64, 0.50)';
  ctx.fillText('Welcome', W / 2, 310);

  // --- 日付・時間 ---
  ctx.font = `100 ${pt(32)}px "${THIN}"`;
  ctx.fillStyle = '#404040';
  ctx.fillText(`${date}　${time}`, W / 2, 430);

  // --- 名前 ---
  ctx.font = `100 ${pt(52)}px "${THIN}"`;
  ctx.fillStyle = '#404040';
  ctx.fillText(name, W / 2, 540);

  // --- メッセージ（改行対応） ---
  ctx.font = `100 ${pt(24)}px "${THIN}"`;
  ctx.fillStyle = '#404040';
  const lines = WELCOME_MESSAGE.split('\n');
  const lineH = pt(16) * 1.9;
  const msgStartY = 670;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, msgStartY + i * lineH);
  });

  // --- フッター ---
  ctx.font = `100 ${pt(16)}px "${THIN}"`;
  ctx.fillStyle = '#BFBFBF';
  ctx.fillText(COMPANY_NAME, W / 2, 980);

  return canvas.toBuffer('image/png');
}

// ==============================
// Discord イベント
// ==============================
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
    const imgBuffer = await generateWelcomeImage(parsed);
    const attachment = new AttachmentBuilder(imgBuffer, { name: 'welcome.png' });

    // 投稿者のロールカラーを取得
    const member = message.member;
    const roleColor = member?.roles?.color?.hexColor ?? '#808080';

    const embed = new EmbedBuilder()
      .setColor(roleColor)
      .setDescription(
        `<@${message.author.id}> !\n` +
        `${parsed.date.replace('/', '月')}日 ${parsed.time.replace(':', '時')} ${parsed.name}のウェルカムを作成したよ！\n\n` +
        `<@&${NOTIFY_ROLE_ID}> みんなにも共有しておくね！`
      )
      .setImage('attachment://welcome.png');

    await message.reply({ embeds: [embed], files: [attachment] });
  } catch (err) {
    console.error(err);
    await message.reply('❌ 画像生成中にエラーが発生しました');
  }
});

client.login(process.env.DISCORD_TOKEN);
