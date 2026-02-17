# Outing Plan

**AIエージェントを活用した外出プラン自動生成アプリケーション**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.3-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Mastra](https://img.shields.io/badge/Mastra-1.3.0-purple)](https://mastra.ai)

---

## デモ

### プラン生成フォーム

![プラン生成フォーム](./public/demo/form.png)

### プラン履歴

![プラン履歴](./public/demo/history.png)

### プラン詳細・地図表示

![プラン詳細](./public/demo/plan-detail.png)

---

## 概要

Google Gemini 2.5とMastraによる2段階AIエージェント処理で、ユーザーの条件（時間・予算・カテゴリ・目的地）に基づいた最適な外出プランを自動生成します。

**プロジェクト規模**: 約10,357行、63ファイル、26コンポーネント

---

## 主な機能

- **AIプラン生成**: 2段階エージェント（スポット検索 → 構造化）
- **Google Maps統合**: マーカー・ルート表示、自動ズーム
- **認証・履歴管理**: Supabase Auth、フィルタリング・ソート
- **レート制限**: データベースベース（10req/分）
- **モニタリング**: Langfuseトレーシング

---

## 技術スタック

| カテゴリ           | 技術                                                               |
| ------------------ | ------------------------------------------------------------------ |
| **フロントエンド** | Next.js 16.1 (App Router), React 19, TypeScript 5, Tailwind CSS v4 |
| **バックエンド**   | Next.js API Routes, Prisma 6.19, PostgreSQL (Supabase)             |
| **AI**             | Mastra 1.3, Google Gemini 2.5 Flash-Lite, Langfuse 3.38            |
| **外部API**        | Google Maps/Places/Directions API                                  |

---

## アーキテクチャ

### 2段階AIエージェント処理

```
ユーザー入力
  ↓
バリデーション + レート制限
  ↓
Agent 1: スポット検索 (Google Places API)
  ↓
Agent 2: JSON構造化 (Strict JSON Mode)
  ↓
データベース保存 + Langfuseトレーシング
```

---

## 技術的特徴

### 型安全性

- TypeScript strict mode + Zod（リクエスト、フォーム、AIレスポンス）

### セキュリティ

- セキュリティヘッダー、Supabase Auth (JWT + RLS)、Open Redirect対策

### AI統合

- 2段階処理で精度向上、Strict JSON Mode、Langfuseトレーシング

### パフォーマンス

- SSR、動的インポート、メタデータ最適化

### コード品質

- ESLint + Prettier、Huskyでコミット前自動チェック

---

## セットアップ

### 前提条件

- Node.js v20+、Supabase/Google Cloud/Langfuseアカウント

### 手順

```bash
git clone https://github.com/lamb48/outing-plan.git
cd outing-plan
npm install
cp .env.example .env.local  # APIキーを設定
npx prisma generate
npx prisma migrate dev
npm run dev  # http://localhost:3000
```

### 環境変数

`.env.local` に以下を設定:

- `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_PLACES_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY` (オプション)

---

## プロジェクト構成

```
app/          # Next.js App Router (ページ・API Routes)
components/   # Reactコンポーネント (plan/, layout/, ui/)
lib/          # ライブラリ (mastra/, supabase/, prisma.ts)
hooks/        # カスタムフック
prisma/       # データベーススキーマ
```

---

## 開発

```bash
npm run dev      # 開発サーバー
npm run build    # ビルド
npm run lint     # ESLint
npm run format   # Prettier
```

---

**GitHub**: [@lamb48](https://github.com/lamb48)
