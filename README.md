# アッパーストラクチャー・コード組み合わせアプリ

左手の4和音（7 / m7 / Maj7 / m7♭5）と、右手のトライアド（Major / Minor / Aug / Dim）を組み合わせ、12キーでアッパーストラクチャー候補を一覧表示する学習・作曲支援 Web アプリです。

候補は生成 AI ではなく、**決定論的な和声エンジン**から導出されます。表示される説明と内部データは常に一致します。

## デモ

GitHub Pages: https://tatmos.github.io/UpperStructureChordApp/

## 機能

- 12行のコード表（G から半音上行）
- 和声スコアに基づく候補選択（推奨 / 色彩的 / 高緊張）
- セル単位の詳細説明（構成音・度数・テンション・選定理由）
- ランダム更新（シード値で再現可能）
- 表記切替（Maj7/△7、m7♭5/ø7 など）

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run test     # 単体テスト
npm run build    # 本番ビルド
npm run preview  # ビルド結果のプレビュー
```

## GitHub Pages へのデプロイ

**重要:** GitHub Pages はビルド済みの `dist` を配信する必要があります。リポジトリ直下の `index.html`（`/src/main.tsx` を参照）をそのまま公開すると真っ白になります。

### 初回設定（どちらか一方）

**方法 A — GitHub Actions（推奨）**

1. リポジトリ **Settings → Pages**
2. **Build and deployment → Source** を **GitHub Actions** に変更
3. `main` へ push（または Actions タブから「Deploy to GitHub Pages」を手動実行）
4. Actions が緑色で完了するまで待つ

**方法 B — gh-pages ブランチ**

1. 上記の Actions が一度成功すると `gh-pages` ブランチが作成されます
2. **Settings → Pages → Source** を **Deploy from a branch** に変更
3. Branch: **gh-pages** / Folder: **/ (root)**

### 手動デプロイ（ローカル）

```bash
npm run deploy
```

`gh-pages` ブランチに `dist` の内容だけを push します（方法 B と併用可）。

### うまく表示されないとき

| 症状 | 原因 | 対処 |
|------|------|------|
| 真っ白、コンソールに `main.tsx` 404 | Source が **main / root** のまま | 上記 A または B に変更 |
| JS/CSS が 404 | デプロイ未実行 or 失敗 | Actions タブで workflow を確認 |
| ローカルは動くが Pages だけおかしい | `base` パス不一致 | `vite.config.ts` の `base: '/UpperStructureChordApp/'` を確認 |

## 技術構成

- Vite + React + TypeScript
- 和声エンジン: `src/engine/`（UI から独立した純粋関数）
- テスト: Vitest

## ライセンス

MIT
