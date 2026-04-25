const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

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
  // 全角数字・スラッシュ・コロン・スペースを半角に正規化
  const normalized = text
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[／]/g, '/')
    .replace(/[：]/g, ':')
    .replace(/　/g, ' ')
    .trim();

  // 日付パターン: 4/25, 4月25日, 04/25 など
  const dateMatch = normalized.match(/(\d{1,2})[\/月](\d{1,2})(?:日)?/);
  // 時間パターン: 10:00, 10時00分, 1000 など
  const timeMatch = normalized.match(/(\d{1,2}):(\d{2})|(\d{1,2})時(\d{2})?(?:分)?/);
  // 名前パターン: 最後の「〇〇様」または「〇〇さん」
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
// 画像生成
// =============================
function generateWelcomeImage({ date, time, name }) {
  const W = 1920, H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // --- 背景グラデーション ---
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#0a0a0f');
  bg.addColorStop(0.5, '#111122');
  bg.addColorStop(1,   '#0a0a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // --- グリッド装飾 ---
  ctx.strokeStyle = 'rgba(100,120,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // --- アクセントライン（左） ---
  const accent = ctx.createLinearGradient(0, 200, 0, 880);
  accent.addColorStop(0, 'rgba(100,140,255,0)');
  accent.addColorStop(0.3, 'rgba(100,180,255,0.9)');
  accent.addColorStop(0.7, 'rgba(160,100,255,0.9)');
  accent.addColorStop(1, 'rgba(160,100,255,0)');
  ctx.fillStyle = accent;
  ctx.fillRect(100, 200, 4, 680);

  // --- アクセントライン（右） ---
  const accent2 = ctx.createLinearGradient(0, 200, 0, 880);
  accent2.addColorStop(0, 'rgba(160,100,255,0)');
  accent2.addColorStop(0.3, 'rgba(160,100,255,0.9)');
  accent2.addColorStop(0.7, 'rgba(100,180,255,0.9)');
  accent2.addColorStop(1, 'rgba(100,180,255,0)');
  ctx.fillStyle = accent2;
  ctx.fillRect(W - 104, 200, 4, 680);

  // --- グロー円（背景） ---
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 700);
  glow.addColorStop(0,   'rgba(80,120,255,0.12)');
  glow.addColorStop(0.5, 'rgba(120,80,255,0.06)');
  glow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // --- WELCOME テキスト ---
  ctx.font = 'bold 72px sans-serif';
  ctx.letterSpacing = '20px';
  ctx.textAlign = 'center';
  // グロー
  ctx.shadowColor = 'rgba(120,160,255,0.8)';
  ctx.shadowBlur = 40;
  const wGrad = ctx.createLinearGradient(W/2 - 200, 0, W/2 + 200, 0);
  wGrad.addColorStop(0, '#a0c0ff');
  wGrad.addColorStop(0.5, '#ffffff');
  wGrad.addColorStop(1, '#c0a0ff');
  ctx.fillStyle = wGrad;
  ctx.fillText('W E L C O M E', W / 2, 260);
  ctx.shadowBlur = 0;

  // --- 細い区切り線 ---
  const lineGrad = ctx.createLinearGradient(300, 0, W - 300, 0);
  lineGrad.addColorStop(0, 'rgba(255,255,255,0)');
  lineGrad.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  lineGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(300, 300, W - 600, 1);

  // --- 日付・時刻 ---
  ctx.font = '400 48px sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillStyle = 'rgba(180,200,255,0.75)';
  ctx.fillText(`${date}　${time}`, W / 2, 390);

  // --- お名前（大きく） ---
  ctx.shadowColor = 'rgba(160,120,255,0.6)';
  ctx.shadowBlur = 60;
  ctx.font = 'bold 160px sans-serif';
  ctx.letterSpacing = '8px';
  const nameGrad = ctx.createLinearGradient(W/2 - 400, 0, W/2 + 400, 0);
  nameGrad.addColorStop(0, '#c0d8ff');
  nameGrad.addColorStop(0.5, '#ffffff');
  nameGrad.addColorStop(1, '#d0c0ff');
  ctx.fillStyle = nameGrad;
  ctx.fillText(name, W / 2, 620);
  ctx.shadowBlur = 0;

  // --- 区切り線（下） ---
  ctx.fillStyle = lineGrad;
  ctx.fillRect(300, 680, W - 600, 1);

  // --- 社名（フッター） ---
  ctx.font = '300 36px sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillStyle = 'rgba(180,200,255,0.5)';
  ctx.fillText('- KOMAI HOME -', W / 2, 800);

  // --- 小装飾（コーナードット） ---
  const dots = [
    [140, 140], [W - 140, 140], [140, H - 140], [W - 140, H - 140]
  ];
  dots.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(140,180,255,0.5)';
    ctx.fill();
  });

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

  // 日付っぽい文字列が含まれるか簡易チェック
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
      content: `📋 **${parsed.date} ${parsed.time} ${parsed.name}** の来場画像を生成しました`,
      files: [attachment],
    });
  } catch (err) {
    console.error(err);
    await message.reply('❌ 画像生成中にエラーが発生しました');
  }
});

client.login(process.env.DISCORD_TOKEN);
