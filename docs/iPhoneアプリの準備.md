  # my coordy iPhone アプリ — 準備手順

## 構成

| 場所 | 中身 |
|---|---|
| `mobile/` | iPhone アプリ（Expo SDK 58）。服のデータは端末内の SQLite、写真は端末の Documents フォルダに保存 |
| `mobile/modules/subject-lifter/` | iOS 標準の Vision で背景を切り抜く自作モジュール（iOS 17 以上） |
| `supabase/` | サーバー側。AI 呼び出し（服の解析・コーデ提案・ショッピング検索・イラスト生成）とアカウント削除の Edge Functions、AI 利用回数のテーブルだけ |
| `src/` ほか | 旧 Web 版（Next.js）。参考用に残しているだけ |

Supabase を設定しなくてもアプリは動きます。その場合、AI 解析とサインインは使えず、服の登録は手入力になります。

## 1. Supabase プロジェクトを作る

1. https://supabase.com でプロジェクトを作成する（リージョンは Tokyo）
2. **Authentication → Sign In / Providers**
   - 「Allow anonymous sign-ins」をオン
   - **Apple** を有効にし、「Client IDs」に `com.akioyamamoto.mycoordy` を入れる（ネイティブのサインインだけなら、Secret Key 欄は空のままで構いません）
3. **SQL Editor** で `supabase/migrations/20261109000000_init.sql` の中身を貼り付けて実行する
4. **Project Settings → API** の「Project URL」と「Publishable key（anon key）」を控えておく

## 2. Edge Functions をデプロイする

ターミナルで `ware` フォルダに移動してから実行します。

```bash
npx supabase login
npx supabase link --project-ref <プロジェクトのID>
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase functions deploy analyze-item
npx supabase functions deploy delete-account
npx supabase functions deploy suggest-outfits
npx supabase functions deploy shopping-search
npx supabase functions deploy generate-coordinate
```

### 任意の機能のキー

どちらも、設定しなければその機能だけが控えめな動きになります。キーは自分のターミナルで登録し、チャットやリポジトリには貼らないでください。

| シークレット | 使う機能 | 未設定のとき |
|---|---|---|
| `OPENAI_API_KEY` | 着せ替え・ショッピングの「AI でイラスト化」（OpenAI gpt-image-1、1枚あたり数円〜十数円） | 「準備中です」と表示 |
| `YAHOO_SHOPPING_APP_ID` | ショッピングで実際の商品を表示（Yahoo!デベロッパーネットワークで無料登録した Client ID） | 検索キーワードと「Yahoo!ショッピングで探す」リンクだけ表示 |

```bash
read -s -p "キーを貼り付けてEnter: " KEY && npx supabase secrets set OPENAI_API_KEY="$KEY" --project-ref <プロジェクトのID>
read -s -p "Client IDを貼り付けてEnter: " KEY && npx supabase secrets set YAHOO_SHOPPING_APP_ID="$KEY" --project-ref <プロジェクトのID>
```

### Apple のトークン取り消し用のシークレット（App Store 審査に必要）

Apple ID でサインインした人がアカウントを削除するとき、Apple 側のトークンも取り消す必要があります。

1. Apple Developer → Certificates, Identifiers & Profiles → **Keys** で「Sign in with Apple」にチェックを入れたキーを作り、`.p8` ファイルをダウンロードする
2. 次のコマンドで登録する

```bash
npx supabase secrets set APPLE_TEAM_ID=XXXXXXXXXX APPLE_KEY_ID=YYYYYYYYYY \
  APPLE_CLIENT_ID=com.akioyamamoto.mycoordy \
  APPLE_PRIVATE_KEY="$(cat AuthKey_YYYYYYYYYY.p8)"
```

## 3. アプリに Supabase の接続先を設定する

`mobile/.env.example` をコピーして `mobile/.env` を作り、手順 1-4 で控えた値を入れます。

## 4. ビルドして iPhone で動かす

背景の切り抜きと Apple サインインはネイティブ機能なので、Expo Go ではなく「開発ビルド」を作って iPhone に入れます。ビルドは Expo のクラウド（EAS）で行うので、Mac に Xcode は要りません。

### 4-1. git の準備（初回のみ）

EAS は git で管理されているファイルだけをクラウドに送ります（`.env` や秘密鍵は送られません）。

```bash
cd ~/vscode/ware
git init
git add .
git commit -m "iPhoneアプリの初期構成"
```

以降、コードを変えてからビルドするときは、先に `git add .` と `git commit -m "変更内容"` をしてください。

### 4-2. Expo にログインしてプロジェクトを作る（初回のみ）

```bash
cd ~/vscode/ware/mobile
npx eas-cli@latest login     # TeamHoop と同じ Expo アカウント
npx eas-cli@latest init      # 「Would you like to create a project…?」→ Y
```

`init` が `app.json` にプロジェクト ID を書き込むので、終わったらもう一度 commit します。

### 4-3. Supabase の接続先を EAS に登録する（初回のみ）

`.env` はクラウドに送られないので、同じ値を EAS にも登録します。次のコマンドを2回実行し、質問に答えます。

```bash
npx eas-cli@latest env:create
```

| 質問 | 1回目 | 2回目 |
|---|---|---|
| Variable name | `EXPO_PUBLIC_SUPABASE_URL` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Variable value | `.env` の URL | `.env` の Publishable key |
| Visibility | Plain text | Plain text |
| Environment | development と production の両方を選ぶ（スペースキーで選択） | 同じ |

### 4-4. iPhone を登録する（初回のみ）

開発ビルドは、登録した iPhone にしかインストールできません。

```bash
npx eas-cli@latest device:create
```

1. Apple Developer アカウントの Apple ID でログインする（2ファクタ認証のコードも聞かれます）
2. 登録方法は **Website** を選ぶ → QR コードが表示される
3. iPhone のカメラで QR を読み、Safari で開いて **Register** → プロファイルをダウンロード
4. iPhone の「設定」→ 上部の「プロファイルがダウンロードされました」→ **インストール**

### 4-5. ビルドする

```bash
npx eas-cli@latest build --profile development --platform ios
```

途中の質問はすべて **Yes**（Enter）で大丈夫です。

- Apple アカウントへのログイン → Yes（Apple ID とパスワード、2ファクタ認証のコード）
- 「Generate a new Apple Distribution Certificate?」→ Yes
- 「Generate a new Apple Provisioning Profile?」→ Yes
- 端末の選択 → 4-4 で登録した iPhone を選ぶ

ビルドには15〜30分かかります（無料プランだと待ち時間が加わります）。進み具合はターミナルに出る URL（expo.dev）で見られます。Bundle ID と「Sign in with Apple」の設定は EAS が Apple に自動で登録します。

### 4-6. iPhone にインストールして起動する

1. ビルドが終わると QR コードが表示されるので、iPhone のカメラで読んで **インストール**
2. 初めて開くと「デベロッパモードが必要」と出ます。iPhone の「設定」→「プライバシーとセキュリティ」→「デベロッパモード」をオンにして再起動します
3. Mac で開発サーバーを起動します

   ```bash
   cd ~/vscode/ware/mobile
   npx expo start
   ```

4. iPhone と Mac を**同じ Wi-Fi** につなぎ、iPhone で my coordy を開きます。サーバーが一覧に出るので選びます（出なければ、ターミナルの QR を iPhone のカメラで読みます）

コードを変えただけなら、再ビルドは不要です。`npx expo start` で開き直せば反映されます。再ビルドが必要なのは、ライブラリの追加や `app.json` の変更など、ネイティブ部分を変えたときだけです。

### 補足

- Bundle ID の `com.akioyamamoto.mycoordy` は仮の値です。変える場合は `mobile/app.json`、上記の Supabase の Client IDs、`APPLE_CLIENT_ID` の3か所を揃えてください。
- ビルドが失敗したら、expo.dev のビルド画面で赤くなっているステップのログを開いて、内容を共有してください。

## 5. TestFlight で配信する

開発ビルド（4章）は Mac の開発サーバーにつないで動きますが、TestFlight 版は単体で動きます。家族や友だちにも配れます。

### 5-1. 本番用ビルドを作って App Store Connect に送る

```bash
cd ~/vscode/ware/mobile
npx eas-cli@latest build --profile production --platform ios --auto-submit
```

途中の質問：

- Apple アカウントへのログイン → Yes（Apple ID・パスワード・2ファクタ認証のコード）
- 証明書・プロビジョニングプロファイルの作成 → すべて Yes
- 「Generate a new App Store Connect API Key?」→ Yes
- App Store Connect にアプリがまだ無い場合は作成されます。アプリ名を聞かれたら `my coordy` と入れます（他のアプリと同じ名前は使えないので、断られたら `my coordy AIクローゼット` などにします）

ビルドに15〜30分、そのあと Apple 側の処理に10〜30分かかります。終わると Apple からメールが届きます。

### 5-2. 自分の iPhone に入れる

1. https://appstoreconnect.apple.com →「マイ App」→ my coordy →「TestFlight」タブ
2. 左の「内部テスト」の「＋」でグループを作り（名前は「自分」など）、テスターに自分の Apple ID を追加する
3. iPhone に App Store から「TestFlight」アプリを入れ、届いた招待から my coordy をインストールする

2回目以降は 5-1 のコマンドを実行するだけで、TestFlight に新しい版が届きます。

## データの扱い（審査・プライバシー表示用のメモ）

- 服の情報・写真・履歴は端末内にだけ保存し、サーバーには送りません（iCloud バックアップの対象）。
- AI 機能を使うと、服の写真・情報、天気や予定の内容が Supabase の Edge Function を経由して Anthropic（解析・提案・検索キーワード）と OpenAI（イラスト生成）に送られます。どこにも保存はしません。初回起動時の同意と、設定画面のスイッチで制御しています。
- 位置情報は天気の取得にだけ使い、端末から Open-Meteo に送ります（おおよその位置）。サーバーには送りません。
- 予定・コーデ履歴・誕生日・パーソナルカラー・AI イラスト（Like）も端末内にだけ保存します。
- サーバーに残るのは、アカウント（匿名または Apple ID）と AI の利用回数だけです。
- AI の1日あたりの上限（匿名 / Apple ID 連携）：服の解析 30 / 100回、コーデ提案 20 / 60回、ショッピング検索 20 / 50回、イラスト生成 3 / 10回（各 Edge Function の `consumeQuota`）。
