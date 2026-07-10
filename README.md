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

1. リポジトリ Settings → Pages → Source を **GitHub Actions** に設定
2. `main` ブランチへ push すると `.github/workflows/deploy.yml` が自動デプロイ

手動デプロイ:

```bash
npm run deploy
```

## 技術構成

- Vite + React + TypeScript
- 和声エンジン: `src/engine/`（UI から独立した純粋関数）
- テスト: Vitest

## ライセンス

MIT
