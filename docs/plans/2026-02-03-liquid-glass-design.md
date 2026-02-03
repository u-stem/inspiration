# Liquid Glass UIデザイン実験

## 概要

iOS 26で導入されたLiquid Glassデザインを`liquid-glass-react`ライブラリで実験的に実装する。

- **目的**: 実験・学習
- **方針**: 別ブランチ（`feature/liquid-glass-ui`）で並行開発
- **ライブラリ**: [liquid-glass-react](https://github.com/rdev/liquid-glass-react)

## 対象コンポーネント

| コンポーネント | ファイル | 変更内容 |
|---------------|---------|---------|
| 背景 | `layout.tsx`, `page.tsx` | グラデーション + 装飾ブロブ |
| ヘッダー | `page.tsx` | LiquidGlassでラップ |
| 検索フォーム | `page.tsx` | LiquidGlassでラップ |
| 結果コンテナ | `page.tsx` | LiquidGlassでラップ |
| ResultCard | `ResultCard.tsx` | LiquidGlassでラップ + 色調整 |

## 設計詳細

### 1. 背景とレイアウト基盤

Liquid Glassの効果を活かすため、背景に視覚的要素を追加。

```tsx
// layout.tsx or page.tsx
<body className="bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 min-h-screen">
  {/* 装飾用ブロブ */}
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl" />
    <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
    <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-500/25 rounded-full blur-3xl" />
  </div>
  {children}
</body>
```

### 2. ヘッダー

```tsx
<header className="sticky top-0 z-10">
  <LiquidGlass
    blurAmount={0.05}
    displacementScale={30}
    cornerRadius={0}
  >
    <div className="max-w-7xl mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-white/90">韻スピレーション</h1>
    </div>
  </LiquidGlass>
</header>
```

### 3. 検索フォーム

```tsx
<LiquidGlass
  blurAmount={0.08}
  displacementScale={50}
  cornerRadius={24}
  className="mb-6"
>
  <div className="p-6">
    <HiraganaInput ... />
    {/* 内部要素の色を透明系に調整 */}
  </div>
</LiquidGlass>
```

**内部要素の色変更:**

| 要素 | 現在 | 変更後 |
|------|------|--------|
| select | `bg-slate-100` | `bg-white/20 backdrop-blur-sm` |
| label | `text-slate-500` | `text-white/70` |
| input | 白背景 | `bg-white/10 border-white/30` |

### 4. 結果コンテナ

```tsx
<LiquidGlass
  blurAmount={0.08}
  displacementScale={50}
  cornerRadius={24}
>
  <div className="p-6 min-h-[300px]">
    {/* タブ */}
    <div className="flex gap-1 mb-4 border-b border-white/20">
      ...
    </div>
    {/* ResultCard一覧 */}
  </div>
</LiquidGlass>
```

**タブの色変更:**

| 状態 | 現在 | 変更後 |
|------|------|--------|
| アクティブ | `border-blue-500 text-blue-600` | `border-blue-400 text-blue-300` |
| 非アクティブ | `text-slate-500` | `text-white/50 hover:text-white/70` |

### 5. ResultCard

```tsx
<LiquidGlass
  blurAmount={0.06}
  displacementScale={40}
  cornerRadius={16}
>
  <div className="p-3">
    {/* 内容 */}
  </div>
</LiquidGlass>
```

**色の変更:**

| 要素 | 現在 | 変更後 |
|------|------|--------|
| 単語 | `text-slate-800` | `text-white` |
| 読み | `text-slate-500` | `text-white/60` |
| 子音タグ | `bg-blue-50 text-blue-600` | `bg-blue-500/30 text-blue-200` |
| 母音タグ | `bg-emerald-50 text-emerald-600` | `bg-emerald-500/30 text-emerald-200` |
| モーラタグ | `bg-slate-100 text-slate-500` | `bg-white/20 text-white/70` |
| スコアバー背景 | `bg-slate-100` | `bg-white/10` |
| スコアバー | `bg-blue-500` | `bg-blue-400/80` |
| アクションボタン | `text-slate-500` | `text-white/70 hover:text-white` |
| ハートアイコン | `text-red-500` | `text-red-400` |
| 区切り線 | `border-slate-100` | `border-white/10` |

## 実装手順

1. ブランチ作成: `feature/liquid-glass-ui`
2. ライブラリインストール: `bun add liquid-glass-react`
3. 背景・レイアウト変更
4. ヘッダーのLiquidGlass化
5. 検索フォームのLiquidGlass化
6. 結果コンテナのLiquidGlass化
7. ResultCardのLiquidGlass化
8. 動作確認・調整

## 注意事項

- Safari/Firefoxは部分サポート（Chrome推奨）
- ResultCardが多い場合のパフォーマンスに注意
- `'use client'`ディレクティブが必要
