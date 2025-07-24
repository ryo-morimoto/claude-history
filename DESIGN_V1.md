# claude-history v1.0 技術設計書

## 概要
v1.0（MVP）はAIを活用したセマンティック検索を含む最小限の機能セットを提供します。

## コアコンセプト
「AIを活用したセマンティック検索でClaude Codeの会話履歴を効率的に検索」

## v1.0 必須機能

### 1. ハイブリッド検索機能
- **セマンティック検索**（OpenAI埋め込み + sqlite-vec）
- **キーワード検索**（SQLite FTS5）
- **ハイブリッド検索**（両方の結果をマージ）
- シンプルな検索結果表示（スコア、タイムスタンプ、プロジェクト名、メッセージ内容）
- 基本的なフィルタ（プロジェクト、期間、メッセージタイプ）

### 2. インデックス作成（initコマンド）
- jsonlファイルの読み込みとパース
- OpenAI APIでテキストをベクトル化
- SQLiteデータベースへの保存（メッセージ + ベクトル）
- 進捗表示（プログレスバー）
- APIキーの対話的設定（初回実行時）

### 3. 必要最小限の設定管理
- 設定ファイル（YAML形式）
- APIキーは環境変数または設定ファイルから取得
- データベースパス、検索モードの設定
- シンプルなログ出力（単一ファイル）

## 外部依存ライブラリ

### 主要ライブラリ
- **@vercel/ai**: 埋め込み生成（OpenAI）
- **commander**: CLIフレームワーク
- **better-sqlite3**: SQLiteクライアント
- **sqlite-vec**: ベクトル検索拡張
- **chalk**: CLI出力の色付け
- **ora**: プログレス表示
- **yaml**: 設定ファイル読み込み
- **zod**: 設定バリデーション
- **inquirer**: 対話的入力（APIキー設定）
- **p-limit**: 並行処理制御

### 開発用ライブラリ
- **typescript**: 型システム
- **tsx**: TypeScript実行環境
- **@types/node**: Node.js型定義
- **@types/better-sqlite3**: better-sqlite3型定義
- **eslint**: リンター
- **prettier**: フォーマッター
- **vitest**: テストフレームワーク

## モジュール構成

### Monorepo構成（機能ベース）

```
packages/
├── core/                         # コア機能パッケージ (@cchistory/core)
│   ├── src/
│   │   ├── search/               # 検索機能
│   │   │   ├── semantic/         # セマンティック検索
│   │   │   │   ├── embedder.ts  # 埋め込み生成
│   │   │   │   └── searcher.ts  # ベクトル類似度検索
│   │   │   ├── keyword/          # キーワード検索
│   │   │   │   └── fts.ts       # FTS5全文検索
│   │   │   ├── hybrid/           # ハイブリッド検索
│   │   │   │   └── merger.ts    # 結果マージロジック
│   │   │   └── index.ts          # 検索API統合
│   │   │
│   │   ├── indexing/             # インデックス作成機能
│   │   │   ├── parser/           # データパーサー
│   │   │   │   └── jsonl.ts     # jsonlファイル解析
│   │   │   ├── embedder/         # 埋め込み生成
│   │   │   │   └── openai.ts    # OpenAI API連携
│   │   │   ├── builder/          # インデックスビルダー
│   │   │   │   └── batch.ts     # バッチ処理ロジック
│   │   │   └── index.ts          # インデックスAPI統合
│   │   │
│   │   ├── storage/              # データ永続化
│   │   │   ├── messages/         # メッセージストア
│   │   │   │   └── repository.ts # メッセージCRUD
│   │   │   ├── vectors/          # ベクトルストア
│   │   │   │   └── sqlite-vec.ts # sqlite-vec操作
│   │   │   ├── database.ts       # SQLite接続管理
│   │   │   └── migrations/       # DBマイグレーション
│   │   │       └── 001_initial.sql # 初期スキーマ
│   │   │
│   │   ├── config/               # 設定管理
│   │   │   ├── loader.ts         # 設定読み込み
│   │   │   ├── validator.ts      # 設定検証（zod）
│   │   │   └── schema.ts         # 設定スキーマ定義
│   │   │
│   │   └── types/                # 共通型定義
│   │       └── index.ts          # Message, SearchResult等
│   │
│   ├── package.json
│   └── tsconfig.json
│
└── cli/                          # CLIパッケージ (@cchistory/cli)
    ├── src/
    │   ├── commands/             # コマンド実装
    │   │   ├── search.ts         # 検索コマンド
    │   │   ├── init.ts           # 初期化コマンド
    │   │   └── config.ts         # 設定コマンド
    │   │
    │   ├── formatters/           # 出力フォーマッター
    │   │   ├── search.ts         # 検索結果フォーマット
    │   │   └── progress.ts       # 進捗表示（ora）
    │   │
    │   ├── interactive/          # 対話的UI
    │   │   └── setup.ts          # セットアップウィザード
    │   │
    │   └── cli.ts               # CLIエントリーポイント
    │
    ├── bin/
    │   └── cchistory             # 実行可能ファイル
    ├── package.json
    └── tsconfig.json
```

### パッケージ間の依存関係

- `@cchistory/cli` → `@cchistory/core`: CLIがコア機能を利用
- `@cchistory/core`: 外部依存なし（独立したビジネスロジック）

### 機能ベース・Monorepo構成の利点

1. **明確な責務分離**
   - 各機能が独立したモジュールとして管理される
   - `core`はビジネスロジック、`cli`はユーザーインターフェースに専念

2. **高い再利用性**
   - coreパッケージを他のインターフェース（Web UI、REST API）でも利用可能
   - 各機能モジュールを個別にインポート可能

3. **優れたテスタビリティ**
   - 機能単位でのユニットテストが容易
   - CLIとコアロジックを分離してテスト可能
   - 各機能モジュールの独立したモック化が可能

4. **拡張性と保守性**
   - 新機能追加時は該当機能ディレクトリに追加するだけ
   - 既存機能への影響を最小限に抑制
   - 依存関係が明確で理解しやすい

5. **開発効率の向上**
   - 複数開発者が異なる機能を並行開発可能
   - 機能ごとのビルド・テストが可能
   - CI/CDでの並列処理が容易

## 主要インターフェース定義

```typescript
// types/index.ts

export interface Message {
  id: string;
  sessionId: string;
  projectName: string;
  messageUuid: string;
  parentUuid?: string;
  type: 'user' | 'assistant' | 'summary';
  role?: string;
  content: string;
  timestamp: Date;
}

export interface SearchOptions {
  projectName?: string;
  limit?: number;
  type?: Message['type'];
  since?: Date;
  mode?: 'semantic' | 'keyword' | 'hybrid';
}

export interface SearchResult {
  message: Message;
  score: number;
  context: {
    before: Message[];
    after: Message[];
  };
}
```

## データベース設計

### SQLスキーマと型定義

```sql
-- メッセージテーブル
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    message_uuid TEXT UNIQUE NOT NULL,
    parent_uuid TEXT,
    type TEXT NOT NULL,
    role TEXT,
    content TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ベクトルテーブル（sqlite-vec）
CREATE VIRTUAL TABLE message_vectors USING vec0(
    message_id INTEGER PRIMARY KEY,
    embedding FLOAT[1536]
);

-- FTS5全文検索
CREATE VIRTUAL TABLE messages_fts USING fts5(
    content,
    content=messages,
    content_rowid=id
);

-- 基本的なインデックス
CREATE INDEX idx_messages_project_timestamp ON messages(project_name, timestamp);
CREATE INDEX idx_messages_type ON messages(type);

-- TypeScript型定義
export interface Message {
  id: number;
  sessionId: string;
  projectName: string;
  messageUuid: string;
  parentUuid?: string;
  type: 'user' | 'assistant' | 'summary';
  role?: string;
  content: string;
  timestamp: Date;
  createdAt: Date;
}

// better-sqlite3での型安全なクエリ例
const insertStmt = db.prepare<Message[]>(`
  INSERT INTO messages (
    session_id, project_name, message_uuid, parent_uuid,
    type, role, content, timestamp
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const searchStmt = db.prepare<[string, number, number], SearchResult>(`
  SELECT 
    m.*,
    vec_distance(mv.embedding, ?) as distance
  FROM messages m
  JOIN message_vectors mv ON m.id = mv.message_id
  WHERE distance <= ?
  ORDER BY distance
  LIMIT ?
`);
```

## 主要機能の実装方針

### 1. ハイブリッド検索

#### 検索フロー
1. ユーザーが検索クエリを入力
2. 検索モードに応じて処理を分岐
   - **セマンティック**: OpenAI APIでクエリをベクトル化し、sqlite-vecで類似検索
   - **キーワード**: FTS5で全文検索
   - **ハイブリッド**: 両方の結果をスコアで重み付けしてマージ
3. 検索結果に前後のメッセージを付加
4. 整形して表示

#### 結果のマージ戦略（ハイブリッド検索）
- **セマンティック検索の重み: 0.7**
- **キーワード検索の重み: 0.3**
- 両方でヒットしたメッセージは加算スコア
- 最終的にスコア順でソート
- 重み付けの計算式: `finalScore = (semanticScore * 0.7) + (keywordScore * 0.3)`

### 2. インデックス作成

#### 処理フロー
1. `~/.claude/projects`配下のjsonlファイルをスキャン
2. 各ファイルを行単位で読み込み
3. メッセージを100件ずつバッチ化
4. OpenAI APIで埋め込みベクトルを生成
5. SQLiteにトランザクションで保存
6. 進捗をプログレスバーで表示

#### パフォーマンス考慮
- バッチサイズ: 100件（API制限とのバランス）
- トランザクション: 1000件ごと
- メモリ制限: 使用量が500MBを超えたらGC実行

### 3. APIキー管理

#### 取得の優先順位
1. 環境変数`OPENAI_API_KEY`をチェック
2. 設定ファイル`~/.claude/cchistory/config.yml`のapi.openai_keyをチェック
3. どちらもない場合は対話的入力を要求

#### 初回実行時の対話フロー
```
$ cchistory "test"
OpenAI API key not found.
? Enter your OpenAI API key: **********************
? Save API key to config file? (Y/n)
API key saved to ~/.claude/cchistory/config.yml
```

## データフロー詳細

### 検索処理フロー

#### 検索の全体フロー
1. CLIが検索クエリとオプションを受け取る
2. SearchServiceが検索モード（semantic/keyword/hybrid）を判定
3. 各検索戦略に応じた処理を実行
   - **セマンティック検索**: クエリをベクトル化し、コサイン類似度で検索
   - **キーワード検索**: SQLiteのFTS5を使用して全文検索
   - **ハイブリッド検索**: 両方の結果をスコアで重み付けしてマージ
4. 検索結果に前後のコンテキスト（メッセージ）を付加
5. フォーマッターが結果を整形して表示

#### 検索戦略の詳細
- **セマンティック検索**: 意味的に類似したメッセージを検索。「リファクタリング」で「コード改善」もヒット
- **キーワード検索**: 完全一致・部分一致でメッセージを検索。高速だが表記揺れに弱い
- **ハイブリッド検索**: セマンティック（重み0.7）とキーワード（重み0.3）の結果を統合

### インデックス作成フロー

#### 初期インデックス作成（initコマンド）
1. `~/.claude/projects`配下の全プロジェクトディレクトリをスキャン
2. 各プロジェクト内のjsonlファイル（セッション）を検出
3. jsonlファイルから行単位でメッセージを抽出
4. メッセージを100件ずつバッチ処理
   - Vercel AI SDKでテキストをベクトル化（1536次元）
   - SQLiteにメッセージ本体とベクトルを保存
5. 進捗をプログレスバーで表示

#### バッチ処理の詳細
- 並行処理数: 最大5（p-limitで制御）
- バッチサイズ: 100メッセージ/バッチ（API制限とメモリのバランス）
- トランザクション: 1000件ごとにコミット（パフォーマンス最適化）

## 設定ファイル

### 場所
`~/.claude/cchistory/config.yml`

### スキーマ
```yaml
# APIキー（環境変数が優先）
api:
  openai_key: "sk-..."

# 検索設定
search:
  limit: 10      # デフォルト結果数
  context: 3     # 前後表示行数

# 除外設定（インデックス作成時）
exclude:
  projects:
    - "test-*"
    - "tmp-*"
  patterns:
    - "password"
    - "secret"
```

## エラーハンドリング

### APIエラー
- **認証エラー**: 
  ```
  Error: OpenAI API authentication failed
  Please check your API key and run 'cchistory init' to reconfigure
  ```
- **レート制限**: 指数バックオフでリトライ（最大3回）
- **ネットワークエラー**: 即座にリトライ（最大3回）

### ファイルエラー
- **読み込みエラー**: ログに記録してスキップ
- **アクセス権限エラー**: 
  ```
  Warning: Cannot access file: /path/to/file
  Please check file permissions
  ```

### データベースエラー
- **接続エラー**: 
  ```
  Error: Cannot connect to database
  Please ensure ~/.claude/cchistory/db/ directory exists and is writable
  ```
- **sqlite-vec読み込みエラー**: 
  ```
  Error: sqlite-vec extension failed to load
  This tool requires sqlite-vec for semantic search functionality
  Please ensure better-sqlite3 is properly installed: npm install -g cchistory
  ```

## CLI仕様

### インストール
```bash
# npmでグローバルインストール
npm install -g cchistory

# またはnpx経由で実行（インストール不要）
npx cchistory
```

### 基本コマンド
```bash
# 検索（デフォルトはハイブリッド）
cchistory "検索キーワード"

# 検索モード指定
cchistory "検索キーワード" --mode semantic
cchistory "検索キーワード" --mode keyword

# フィルタオプション
cchistory "検索キーワード" --project "project-name"
cchistory "検索キーワード" --limit 20
cchistory "検索キーワード" --type user
cchistory "検索キーワード" --since "2025-01-01"

# 初期化
cchistory init
```

### 出力フォーマット
```
[0.85] [2025-07-22 14:22:20] project: claude-history
Session: b374713b-e157-4dd7-9c48-60e7a0064f0f
User: リファクタリングしてください
Assistant: コードをリファクタリングします...

---

[0.72] [2025-07-21 10:15:30] project: gh-cc-classifier
Session: 01834ecf-5a92-461a-9c0b-0e289429bd1d
User: Please classify the following GitHub comment...
Assistant: {"category": "feedback", "confidence": 0.85...}
```

## 実装優先順位

### 開発期間目安
- **3-4週間**で実装可能（セマンティック検索含む）
- 最も価値のある機能（AI検索）を最初から提供
- ユーザーフィードバックを収集

### 実装順序

1. **データベース基盤**
   - SQLite + sqlite-vec初期化
   - Drizzle ORMのセットアップ
   - スキーマ定義と初期マイグレーション
   - 基本的なCRUD操作

2. **インデックス作成機能**
   - jsonlファイル読み込み
   - OpenAI API連携
   - バッチ処理とプログレス表示
   - Drizzleを使用したデータ永続化

3. **検索機能**
   - キーワード検索（FTS5）
   - セマンティック検索（ベクトル検索）
   - ハイブリッド検索（結果マージ）

4. **CLI実装**
   - Commander.jsによるコマンド定義
   - 出力フォーマッター
   - エラーハンドリング

5. **設定管理**
   - 設定ファイル読み込み
   - APIキー管理
   - 対話的セットアップ

## テスト戦略

### ユニットテスト
- 各サービスクラスの単体テスト
- モックを使用したAPI呼び出しテスト
- エラーケースのテスト

### 統合テスト
- 実際のSQLiteデータベースを使用
- サンプルデータでの検索テスト
- CLI コマンドのE2Eテスト

## パッケージ構成

### package.json

```json
{
  "name": "cchistory",
  "version": "1.0.0",
  "description": "AI-powered semantic search for Claude Code conversation history",
  "type": "module",
  "main": "./dist/cli.js",
  "bin": {
    "cchistory": "./bin/cchistory"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest",
    "lint": "eslint src",
    "format": "prettier --write src",
    "clean": "rm -rf dist",
    "db:generate": "drizzle-kit generate:sqlite",
    "db:push": "drizzle-kit push:sqlite",
    "prepublishOnly": "pnpm build"
  },
  "dependencies": {
    "@vercel/ai": "^3.0.0",
    "better-sqlite3": "^9.0.0",
    "sqlite-vec": "^0.1.0",
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.0",
    "inquirer": "^9.0.0",
    "zod": "^3.22.0",
    "yaml": "^2.3.0",
    "p-limit": "^5.0.0",
    "drizzle-orm": "^0.29.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "prettier": "^3.0.0",
    "eslint": "^8.0.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "@types/better-sqlite3": "^7.0.0",
    "tsx": "^4.0.0",
    "drizzle-kit": "^0.20.0"
  },
  "files": [
    "dist",
    "bin"
  ],
  "keywords": [
    "claude",
    "claude-code",
    "search",
    "semantic-search",
    "cli",
    "ai"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/cchistory.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/cchistory/issues"
  },
  "homepage": "https://github.com/yourusername/cchistory#readme",
  "engines": {
    "node": ">=18.0.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

## セキュリティ考慮事項

- APIキーは設定ファイルまたは環境変数で管理
- 設定ファイルのパーミッションは600に設定
- ホームディレクトリ外へのアクセスは禁止
- SQLインジェクション対策（パラメータ化クエリ使用）

## 初回セットアップフロー

### セットアップウィザード

#### 起動条件
- 設定ファイルが存在しない
- データベースファイルが存在しない
- コマンドライン引数で`--setup`が指定された

#### セットアップの流れ
1. **ウェルカムメッセージ**
   - ツールの概要説明
   - 必要な権限の説明（ホームディレクトリへのアクセス）

2. **APIキー設定**
   - 環境変数のチェック
   - 未設定の場合は対話的入力
   - 入力されたキーの検証（テスト埋め込み生成）
   - 設定ファイルに保存（パーミッション600）

3. **データベース初期化**
   - ディレクトリ作成
   - SQLiteデータベース作成
   - Drizzleマイグレーションの適用
   - sqlite-vec拡張の手動作成
   - FTS5インデックスの手動作成

4. **初回インデックス作成**
   - Claude Code履歴の検出
   - 見つかったプロジェクト数とセッション数を表示
   - **APIコストの警告表示**:
     ```
     ⚠️  インデックス作成にはOpenAI APIを使用します
     初回実行では大量のAPIリクエストが発生する可能性があります
     
     制限オプション:
     - 直近7日間のデータのみ処理（推奨）
     - 全データを処理
     ```
   - **初回実行時の制限**:
     - デフォルト: 直近7日間のメッセージのみ
     - または: 最大10,000メッセージまで
     - `--all`オプションで全データ処理可能
   - インデックス作成の確認プロンプト
   - 実行時は進捗バーで状況表示
     - 処理済み/総メッセージ数
     - 推定残り時間

### 設定の永続化

#### 設定ファイルの作成
- YAML形式で`~/.claude/cchistory/config.yml`に保存
- ファイルパーミッションを600に設定
- デフォルト値を含む完全な設定を生成

## CLI実装

### コマンド構成

#### メインコマンド（検索）
- `cchistory "検索クエリ"` - デフォルトで検索を実行
- オプション:
  - `--project`: プロジェクトフィルタ
  - `--limit`: 結果数制限
  - `--type`: メッセージタイプフィルタ
  - `--since`: 期間フィルタ
  - `--mode`: 検索モード選択

#### サブコマンド
- `cchistory init`: データベース初期化とインデックス作成
  - `--all`: 全データをインデックス（デフォルトは直近7日間）
  - `--days <number>`: 指定日数分のデータをインデックス

### ユーザー体験の設計

#### プログレス表示
- ora（スピナー）で処理中を表示
- インデックス作成時は進捗バーで詳細な進行状況を表示

#### 出力の色分け
- エラー: 赤色
- 警告: 黄色
- 成功: 緑色
- 重要情報: 青色

#### インタラクティブ機能
- 初回実行時のセットアップウィザード
- APIキーの対話的入力（マスク表示）

## 設定管理

### 設定の階層と優先順位
1. **デフォルト設定**: ハードコードされた初期値
2. **設定ファイル**: `~/.claude/cchistory/config.yml`
3. **環境変数**: CCHISTORY_で始まる環境変数
4. **コマンドラインオプション**: 実行時の引数

### APIキー管理

#### APIキー保存方式
- 初回実行時に対話的にAPIキーを入力
- 設定ファイルに平文で保存（AWS CLI、Stripe CLI等と同様）
- 設定ファイルのパーミッションを600に設定
- 環境変数が設定されている場合はそちらを優先

#### APIキー取得の流れ
1. 環境変数`OPENAI_API_KEY`をチェック
2. 設定ファイルの暗号化されたキーをチェック
3. どちらも無い場合は対話的入力を要求
4. 入力されたキーを検証（OpenAI APIにテスト接続）
5. 設定ファイルに保存（パーミッション600）

## パフォーマンス最適化戦略

### データベースとsqlite-vec統合

#### データベース初期化
- SQLiteデータベースファイルを`~/.claude/cchistory/db/`に作成
- Drizzleマイグレーションを自動適用（messagesテーブル等）
- sqlite-vec拡張をロードしてベクトル検索機能を有効化
- message_vectorsテーブルを手動作成（sqlite-vec用）
- messages_ftsテーブルを手動作成（FTS5用）
- WALモードを有効化して読み書きの並行性を向上

#### ベクトル検索の仕組み
- message_vectorsテーブルにOpenAI埋め込み（1536次元）を保存
- コサイン類似度でベクトル間の距離を計算
- 類似度の高い順にメッセージを返却
- インデックスによる高速化（Approximate Nearest Neighbor）

### データ永続化戦略

#### メッセージストアの責務
- メッセージの保存・更新・削除
- ベクトルデータの保存・検索
- 全文検索（FTS5）の実行
- トランザクション管理

#### バッチ処理とトランザクション
- 1000件ごとにトランザクションをコミット（書き込み性能の最適化）
- エラー時はロールバックして整合性を保証
- プログレス情報をメモリに保持し、中断時の再開に対応

### 起動時間の最適化

#### 遅延初期化
- データベース接続は最初のクエリ実行時
- 設定ファイルは必要時に読み込み
- sqlite-vec拡張は検索時にのみロード

#### 起動時チェックの最小化
- 必須チェックのみ実行（APIキー、DBファイル存在確認）
- 詳細な検証は実際の処理時に実施

### データベースマイグレーション管理

#### Drizzle-kitによる自動マイグレーション
- スキーマ変更時に`pnpm db:generate`でマイグレーションファイル生成
- 初回起動時に自動的にマイグレーション適用
- マイグレーション履歴は`drizzle`メタテーブルで管理

#### マイグレーション戦略
1. **開発環境**: `pnpm db:push`で即座に適用
2. **本番環境**: 起動時に未適用のマイグレーションを検出・実行
3. **バージョン管理**: migrations/ディレクトリをGit管理

#### 特殊テーブルの扱い
- **sqlite-vec（ベクトル）**: 初回起動時に手動作成
- **FTS5（全文検索）**: 初回起動時に手動作成
- **通常テーブル**: Drizzleで完全管理

## 開発環境のセットアップ

### 必要な環境

#### 開発環境
- Node.js v22以上 (最新LTS推奨)
- pnpm v9以上 (最新版推奨)
- macOS / Linux / Windows (WSL2)

#### 動作環境 (エンドユーザー)
- Node.js v18以上
- npm/yarn/pnpm いずれか (インストール用)

### 初期セットアップ
```bash
# リポジトリのクローン
git clone https://github.com/username/cchistory.git
cd cchistory

# pnpmのインストール (未インストールの場合)
corepack enable
corepack prepare pnpm@latest --activate

# 依存関係のインストール
pnpm install

# 開発環境での実行
pnpm dev

# ビルド
pnpm build

# テスト実行
pnpm test

# リント実行
pnpm lint
```

### 開発ワークフロー
1. **機能開発**: 該当する機能ディレクトリで実装
2. **ユニットテスト**: 機能ごとにテストを作成
3. **ローカルテスト**: `pnpm dev`で動作確認
4. **ビルド確認**: `pnpm build`でコンパイル確認
5. **リント**: `pnpm lint`でコード品質チェック

### パッケージ公開

```bash
# ビルド
pnpm build

# テスト実行
pnpm test

# パッケージ公開
pnpm publish --access public
```

### エンドユーザーのインストール方法

ユーザーは以下のいずれかの方法でインストール可能：
- `npm install -g cchistory`
- `npx cchistory`
- `yarn global add cchistory`
- `pnpm add -g cchistory`
