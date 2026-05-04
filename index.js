// ...（前段のrequireやparseVisitorMessageは変更なし）

// ==============================
// 画像生成
// ==============================
async function generateWelcomeImage({ date, time, name }, W = 1920, H = 1080) {
  // ぼやけ対策：内部的に2倍の解像度で描画し、出力時に高画質なJPGにする
  const scale = 2;
  const canvas = createCanvas(W * scale, H * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale); // 全ての描画を2倍サイズに自動スケール

  const BLACK = 'NotoSansJP-Black';
  const THIN  = 'NotoSansJP-Thin';
  const pt = v => Math.round(v * 96 / 72);

  // --- 描画処理（元の座標とフォント設定を完全に維持） ---
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(W*0.021, H*0.037, W*0.958, H*0.926);

  ctx.strokeStyle = '#E8E8E8';
  ctx.lineWidth = 1;
  ctx.strokeRect(W*0.029, H*0.052, W*0.942, H*0.896);

  try {
    const bgImg = await loadImage(path.join(__dirname, 'bg.png'));
    ctx.globalAlpha = BG_OPACITY;
    ctx.drawImage(bgImg, 0, 0, W, H);
    ctx.globalAlpha = 1.0;
  } catch (e) {}

  ctx.textAlign = 'center';

  const wSize = pt(80);
  ctx.font = `900 ${wSize}px "${BLACK}"`;
  ctx.fillStyle = 'rgba(64, 64, 64, 0.50)';
  ctx.fillText('Welcome', W / 2 + 6, 310);
  ctx.fillText('Welcome', W / 2, 310);

  ctx.font = `100 ${pt(32)}px "${THIN}"`;
  ctx.fillStyle = '#404040';
  ctx.fillText(`${date}　${time}`, W / 2, 430);

  ctx.font = `100 ${pt(52)}px "${THIN}"`;
  ctx.fillStyle = '#404040';
  ctx.fillText(name, W / 2, 540);

  ctx.font = `100 ${pt(24)}px "${THIN}"`;
  ctx.fillStyle = '#404040';
  const lines = WELCOME_MESSAGE.split('\n');
  const lineH = pt(16) * 1.9;
  const msgStartY = 670;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, msgStartY + i * lineH);
  });

  ctx.font = `100 ${pt(16)}px "${THIN}"`;
  ctx.fillStyle = '#BFBFBF';
  ctx.fillText(COMPANY_NAME, W / 2, 980);

  // JPEG形式で、画質100%で出力
  return canvas.toBuffer('image/jpeg', { quality: 100 });
}

// ==============================
// Discord イベント
// ==============================
// ...（中略）
  try {
    const fullBuffer = await generateWelcomeImage(parsed, 1920, 1080);
    // ファイル名を welcome.jpg に変更
    const fullFile  = new AttachmentBuilder(fullBuffer, { name: 'welcome.jpg' });

    // ...（中略）
    const embed = new EmbedBuilder()
      .setColor(roleColor)
      .setDescription(`...作成したよ！`) // メッセージはお好みで
      .setImage('attachment://welcome.jpg'); // ここも jpg に合わせる

    await message.reply({ embeds: [embed], files: [fullFile] });
// ...
