# 来場者ウェルカム Discord Bot

Discordに投稿されたテキストから、社内モニター用の来場者アナウンス画像を自動生成するBotです。

## 機能

- `4/25 10:00 斉藤様` のような投稿を検知
- 全角/半角・表記ゆれに自動対応
- 16:9 (1920×1080) のウェルカム画像を生成して返信

## 対応フォーマット例

```
4/25 10:00 斉藤様
４月２５日　１０：００　佐藤様
4月25日 10時00分 田中さん
04/25　10:00　山田様
```

---

## セットアップ手順

### 1. Discord Bot の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く
2. **New Application** → アプリ名を入力
3. 左メニュー **Bot** → **Add Bot**
4. **TOKEN** の「Reset Token」でトークンをコピーして控えておく
5. **Privileged Gateway Intents** の `MESSAGE CONTENT INTENT` を **ON** にする
6. 左メニュー **OAuth2 → URL Generator** で以下を選択：
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Attach Files`, `Read Message History`
7. 生成されたURLでBotをサーバーに招待

### 2. ローカルで動かす場合

```bash
# リポジトリをクローン
git clone <your-repo-url>
cd discord-bot

# 依存パッケージをインストール
npm install

# 環境変数を設定
cp .env.example .env
# .env を編集して DISCORD_TOKEN を設定

# 起動
npm start
```

### 3. Railway にデプロイする場合（推奨・無料）

1. [Railway.app](https://railway.app) でアカウント作成
2. **New Project → Deploy from GitHub repo** でこのリポジトリを選択
3. **Variables** タブで環境変数を追加：
   ```
   DISCORD_TOKEN = your_discord_bot_token_here
   ```
4. 自動でデプロイが始まり、24時間稼働します

---

## カスタマイズ

`index.js` の `generateWelcomeImage` 関数内を編集することで：

- **社名変更**: `'YOUR COMPANY NAME'` の部分を変更
- **カラー変更**: グラデーションの色コードを変更
- **フォント変更**: `registerFont()` で別フォントを登録可能

---

## ファイル構成

```
discord-bot/
├── index.js          # Bot本体
├── package.json
├── railway.toml      # Railwayデプロイ設定
├── .env.example      # 環境変数テンプレート
├── .gitignore
└── README.md
```
