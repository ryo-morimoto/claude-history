# claude-history 要件定義書

## 概要
Claude Codeとのやり取りの履歴（~/.claude/projectsに保存されているjsonlファイル）を自然言語で検索できるCLIツール

## 背景
- Claude Codeの会話履歴は`~/.claude/projects`ディレクトリにjsonl形式で自動保存される
- プロジェクトごとにディレクトリが作成され（命名規則：プロジェクト名をファイルシステムセーフな形式に変換）、セッションごとにUUID名のjsonlファイルが作成される
- 各jsonl行には、ユーザーメッセージ、アシスタントの応答、メタ情報などが含まれる

## 主要機能

### 1. 自然言語検索
- セマンティック検索（意味的に類似した内容を検索）
  - 検索クエリをベクトル化（OpenAI API使用）
  - 保存済みメッセージベクトルとの類似度計算
- キーワード検索（完全一致・部分一致、API不要）
- ハイブリッド検索（セマンティック + キーワード）

### 2. 検索対象
- ユーザーメッセージ（`type: "user"`）
- アシスタントメッセージ（`type: "assistant"`）
- サマリー情報（`type: "summary"`）

### 3. 検索結果表示
- マッチした会話のコンテキスト表示（前後3行、設定で変更可能）
- 類似度スコア表示（0.0-1.0の数値、小数点以下2桁）
- タイムスタンプ表示（YYYY-MM-DD HH:MM:SS形式）
- プロジェクト名表示
- セッションIDとメッセージへのリンク（file://形式でjsonlファイルへの直接リンク）

## 技術要件

1. **実装言語**: Node.js/TypeScript
2. **パッケージマネージャー**: npm
3. **CLIフレームワーク**: Commander.js
4. **データベース**: SQLite + sqlite-vec拡張
   - ORM: Drizzle ORM（軽量・高速・型安全）
   - sqlite-vec拡張のインストール：プラットフォーム別のバイナリを自動ダウンロード
5. **ベクトル化**: 
   - OpenAI Embeddings API（デフォルト）
   - ローカル埋め込みモデル（Transformers.js）
   - 切り替え：設定ファイルまたは環境変数で制御
6. **データ永続化**: 
   - SQLiteデータベース（~/.claude/cchistory/db/claude-history.db）
   - 初回実行時に全履歴をインポート
   - 新規セッションの差分更新（自動：起動時、手動：syncコマンド実行時）

## データベーススキーマ

```sql
-- メッセージテーブル
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    message_uuid TEXT UNIQUE NOT NULL,
    parent_uuid TEXT,
    type TEXT NOT NULL, -- 'user', 'assistant', 'summary'
    role TEXT,
    content TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ベクトルテーブル（sqlite-vec用）
CREATE VIRTUAL TABLE message_vectors USING vec0(
    message_id INTEGER PRIMARY KEY,
    embedding FLOAT[1536] -- OpenAI ada-002の次元数
);

-- 検索履歴テーブル
CREATE TABLE search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    mode TEXT NOT NULL, -- 'semantic', 'keyword', 'hybrid'
    options TEXT, -- JSON形式で保存（project, type, since, limit等）
    result_count INTEGER NOT NULL,
    execution_time_ms INTEGER,
    embedding_model TEXT,
    error_message TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_search_history_executed_at (executed_at),
    INDEX idx_search_history_query (query)
);

-- 統計テーブルは不要（search_historyから直接集計で十分）
```

## インターフェース

```bash
# 基本的な使い方（検索 - サブコマンドなし）
npx cchistory "検索キーワード"

# 検索オプション
npx cchistory "検索キーワード" --project "project-name"  # 特定プロジェクトのみ検索
npx cchistory "検索キーワード" --limit 20               # 結果数の制限
npx cchistory "検索キーワード" --type user              # ユーザーメッセージのみ検索
npx cchistory "検索キーワード" --since "2025-01-01"     # 期間指定
npx cchistory "検索キーワード" --mode semantic         # セマンティック検索のみ
npx cchistory "検索キーワード" --mode keyword          # キーワード検索のみ

# 除外フィルタ
npx cchistory "検索キーワード" --exclude-project "test-*,tmp-*"  # プロジェクト名のパターン除外
npx cchistory "検索キーワード" --exclude-session "uuid1,uuid2"   # 特定セッションを除外
npx cchistory "検索キーワード" --exclude-before "2024-01-01"     # 特定日付以前を除外
npx cchistory "検索キーワード" --exclude-pattern "password|secret" # 内容パターンで除外

# 管理サブコマンド
npx cchistory init                                       # データベースの初期化・再インデックス
npx cchistory sync                                       # データベースの差分更新
```

## 出力フォーマット
```
[2025-07-22 14:22:20] project: gh-cc-classifier
Session: 01834ecf-5a92-461a-9c0b-0e289429bd1d
User: Please classify the following GitHub comment...
Assistant: {"category": "feedback", "confidence": 0.85...}

---

[2025-07-21 10:15:30] project: claude-history
Session: b374713b-e157-4dd7-9c48-60e7a0064f0f
User: リファクタリングしてください
Assistant: コードをリファクタリングします...
```

## パフォーマンス要件
- 初回インデックス作成: 1000セッション以下で1分以内
- 検索レスポンス: 100ms以内（ローカル検索時）
- メモリ使用量: 500MB以下
- 同時実行: 複数インスタンスの同時実行を考慮（データベースロック処理）

## エラーハンドリング仕様

### ファイル読み込みエラー
- jsonlファイルが破損している場合：エラーログを出力し、該当ファイルをスキップして処理継続
- ファイルアクセス権限がない場合：警告メッセージを表示し、スキップ
- ディレクトリが存在しない場合：エラーメッセージを表示し、処理を中断

### データベースエラー
- SQLiteデータベースの初期化失敗：エラーメッセージと対処法を表示
- sqlite-vec拡張のロード失敗：エラーメッセージを表示して処理を中断
- データベース破損時：再初期化オプションを提供

### API関連エラー
- OpenAI API接続エラー：リトライ処理（最大3回）、失敗時はエラー終了
- APIキー未設定：対話的プロンプトでAPIキーの入力を要求し、設定ファイルに保存
- レート制限エラー：待機時間を表示し、自動リトライ

### 検索エラー
- 検索結果が0件：類似クエリの提案機能
- 不正な検索クエリ：エラー内容と正しい使用法を表示

## 設定管理

### 設定ファイル
- 場所：`~/.claude/cchistory/config.yml`（ユーザーホームディレクトリの隠しフォルダ内に配置）
- 形式：YAML
- 初回実行時：設定ファイルが存在しない場合は対話的セットアップで作成
- 設定例：
```yaml
# 設定ファイル例
api:
  openai_key: "sk-..."  # 環境変数が未設定時に使用

search:
  limit: 10  # デフォルト検索結果数
  context: 3  # 前後表示行数

# 除外設定（インデックス作成時に適用）
exclude:
  projects:
    - "test-*"
    - "tmp-*"
  patterns:
    - "password"
    - "secret"

# ローカル埋め込みモデル使用時のみ
embedding:
  provider: local  # デフォルトはopenai
  model_path: ~/.claude/models/all-MiniLM-L6-v2
```

### 環境変数
- `CCHISTORY_CONFIG`：設定ファイルパスの上書き
- `OPENAI_API_KEY`：OpenAI APIキー（設定ファイルで指定された環境変数名）
- `CCHISTORY_DB_PATH`：データベースパスの上書き
- `CCHISTORY_LOG_LEVEL`：ログレベルの上書き

### APIキー管理（AWS CLI方式を参考）
- **保存場所の優先順位**：
  1. 環境変数（`OPENAI_API_KEY`）
  2. 設定ファイル（`~/.claude/cchistory/config.yml`）に平文保存
  
- **初回設定フロー**：
  ```bash
  $ npx cchistory configure
  OpenAI API key [None]: sk-**********************
  Default search mode [hybrid]: 
  Default result limit [10]: 
  
  Configuration saved to ~/.claude/cchistory/config.yml
  ```

- **セキュリティ**：
  - 設定ファイルのパーミッションを600に設定（ユーザーのみ読み取り可能）
  - 多くのCLIツール（AWS CLI、GitHub CLI等）が採用する実績ある方式
  - OSレベルでの保護に依存（追加の暗号化は実装コストに見合わない）

- **検索時のAPIキー要否**：
  - インデックス作成時（初回・sync時）：必要（新規メッセージの埋め込み生成）
  - 検索実行時：
    - セマンティック検索：必要（クエリの埋め込み生成）
    - キーワード検索：不要
    - ハイブリッド検索：必要

- **キーワード検索専用モード**：
  ```bash
  $ npx cchistory "検索キーワード" --mode keyword  # APIキー不要で動作
  ```

## ログ仕様

### ログレベル
- `debug`：詳細なデバッグ情報（SQL文、API呼び出しの詳細）
- `info`：通常の処理情報（インデックス作成、検索実行）
- `warn`：警告情報（ファイルスキップ、フォールバック）
- `error`：エラー情報（処理失敗、例外発生）

### ログフォーマット
```
[2025-07-22 15:30:45] [INFO] [search] Query executed: "リファクタリング" (mode: hybrid, results: 5)
[2025-07-22 15:30:46] [WARN] [index] Skipped corrupted file: ~/.claude/projects/project-a/session-123.jsonl
```

### ログファイル管理（シンプル化）
- 単一ログファイル：`~/.claude/cchistory/cchistory.log`
- 最大サイズ：10MB（超過時は古い内容を削除）
- ローテーション不要（CLIツールには過剰）

## 除外フィルタ機能

### 除外条件の種類
1. **プロジェクト名除外**
   - ワイルドカード対応（`test-*`, `tmp-*`）
   - カンマ区切りで複数指定可能
   - 大文字小文字を区別しない

2. **セッション除外**
   - UUID完全一致による除外
   - カンマ区切りで複数指定可能

3. **期間除外**
   - 特定日付以前のメッセージを除外
   - ISO 8601形式（YYYY-MM-DD）

4. **内容パターン除外**
   - 正規表現によるメッセージ内容の除外
   - パイプ（|）で複数パターン指定可能
   - セキュリティ関連キーワードのフィルタリング

### 設定ファイルでの永続的な除外設定
```yaml
# ~/.claude/cchistory/config.yml
exclude:
  projects:
    - "test-*"
    - "tmp-*"
    - ".backup-*"
  sessions: []  # 除外するセッションUUID
  patterns:
    - "password"
    - "secret"
    - "api[_-]?key"
  before_date: null  # YYYY-MM-DD形式
```

### 除外フィルタの適用タイミング
1. **インデックス作成時**: 除外対象はインデックスに含めない（ストレージ節約）
2. **検索時**: コマンドラインオプションで動的に除外

## 検索履歴機能

### 概要
過去の検索クエリを保存し、再利用できる機能を提供する。頻繁に検索する内容を素早く再実行でき、検索の生産性を向上させる。

### 検索履歴の保存内容
1. **基本情報**
   - 検索クエリ（元のクエリ文字列）
   - 検索実行日時（タイムスタンプ）
   - 検索モード（semantic/keyword/hybrid）
   - 検索オプション（プロジェクト、期間、タイプなど）
   - 検索結果数

2. **メタ情報**
   - 検索実行時間（ミリ秒）
   - 使用した埋め込みモデル（セマンティック検索時）
   - エラー有無

### 検索履歴の管理

#### データ保存
- 保存場所：SQLiteデータベース内の専用テーブル
- 保存期間：デフォルト90日（設定可能）
- 最大保存数：1000件（設定可能、古いものから自動削除）

#### プライバシー設定
```yaml
# ~/.claude/cchistory/config.yml
search_history:
  enabled: true  # 履歴機能のON/OFF
  retention_days: 90  # 保存期間（日）
  max_entries: 1000  # 最大保存数
  save_options: true  # 検索オプションも保存するか
  exclude_patterns:  # 履歴に保存しないパターン
    - "password"
    - "secret"
    - "token"
```

### 検索履歴のCLIインターフェース

```bash
# 検索履歴の表示（最新10件）
npx cchistory history

# 検索履歴の表示（件数指定）
npx cchistory history --limit 20

# 検索履歴から再実行（履歴番号指定）
npx cchistory history --run 5

# 検索履歴から再実行（インタラクティブ選択）
npx cchistory history --interactive

# 頻出検索クエリの表示（上位10件）
npx cchistory history --frequent

# 検索履歴の削除（全件）
npx cchistory history --clear

# 検索履歴の削除（特定の履歴）
npx cchistory history --delete 5

# 検索履歴のエクスポート
npx cchistory history --export history.json
```

### 検索履歴の表示フォーマット
```
[1] 2025-07-22 15:30:45 | "リファクタリング" | mode: hybrid | results: 15 | 120ms
    Options: --project claude-history --since 2025-07-01
    
[2] 2025-07-22 14:22:10 | "error handling" | mode: semantic | results: 8 | 95ms
    Options: --type assistant --limit 20

[3] 2025-07-21 10:15:30 | "typescript interface" | mode: keyword | results: 23 | 45ms
    Options: --project gh-cc-classifier
```

### インタラクティブモード
```
$ npx cchistory history --interactive

Recent searches:
> [1] "リファクタリング" (15 results)
  [2] "error handling" (8 results)  
  [3] "typescript interface" (23 results)
  [4] "async await" (12 results)
  [5] "test implementation" (7 results)

Select a search to run (1-5) or 'q' to quit: 
```

### 検索サジェスト機能
- 検索クエリ入力時に過去の類似検索を提案
- 部分一致によるオートコンプリート
- 使用頻度を考慮した順位付け

### パフォーマンス要件
- 履歴の保存：10ms以内
- 履歴の検索：50ms以内
- 履歴からの再実行：元の検索と同等の性能

## 非機能要件

### 可用性
- **起動時間**: 3秒以内（データベース接続・初期化含む）
- **並行処理**: 複数インスタンスの同時実行をサポート（読み取り専用モード）
- **エラー復旧**: データベースロックエラー時は最大3回リトライ（1秒間隔）

### 拡張性
- **データ容量**: 最大10,000セッション、100万メッセージまで対応（約7GB）
- **検索性能**: 
  - 10万メッセージまで: 1秒以内
  - 100万メッセージ: 3秒以内
- **モジュール設計**: 新しい埋め込みモデルやデータソースを容易に追加可能

### 保守性
- **コード品質**: TypeScript strict mode、ESLint設定によるコード品質維持
- **テスト**: 単体テストカバレッジ80%以上、E2Eテスト主要シナリオ網羅
- **ドキュメント**: APIドキュメント自動生成、READMEによる使用方法明記
- **ログ**: 問題調査に必要な情報を構造化ログで出力

### 性能要件（具体化）
- **インデックス作成**: 
  - 1,000セッション: 1分以内
  - 10,000セッション: 10分以内（バッチ処理）
- **メモリ使用量**: 
  - 通常検索: 500MB以下
  - ベクトル検索時: 最大1GB（大規模データ時）
  - インデックス作成時: 最大1.5GB

## インデックス戦略

### 概要
効率的な検索とクエリパフォーマンスを実現するための包括的なインデックス設計。クエリパターンの分析に基づき、最適なインデックスを定義する。

### インデックス設計原則
1. **選択性の高いカラムを優先**：ユニークな値が多いカラムから順に配置
2. **複合インデックスの順序**：WHERE句で頻繁に使用される順に配置
3. **カバリングインデックス**：SELECT句の全カラムを含めることで、テーブルアクセスを削減
4. **書き込み性能とのバランス**：過剰なインデックスは挿入・更新性能を低下させるため、必要最小限に留める

### 主要テーブルのインデックス

#### messagesテーブル
```sql
-- プロジェクト別の時系列検索用（最も頻繁なクエリパターン）
CREATE INDEX idx_messages_project_timestamp ON messages(project_name, timestamp DESC);

-- メッセージタイプ別検索用
CREATE INDEX idx_messages_type_timestamp ON messages(type, timestamp DESC);

-- セッション別メッセージ取得用
CREATE INDEX idx_messages_session_timestamp ON messages(session_id, timestamp ASC);

-- プロジェクトとタイプの複合検索用
CREATE INDEX idx_messages_project_type_timestamp ON messages(project_name, type, timestamp DESC);

-- 親子関係の追跡用
CREATE INDEX idx_messages_parent_uuid ON messages(parent_uuid) WHERE parent_uuid IS NOT NULL;
```

#### search_historyテーブル
```sql
-- 実行日時による履歴検索（既存）
CREATE INDEX idx_search_history_executed_at ON search_history(executed_at DESC);

-- クエリ文字列による検索（既存）
CREATE INDEX idx_search_history_query ON search_history(query);

-- 検索モード別の統計用
CREATE INDEX idx_search_history_mode_executed ON search_history(mode, executed_at DESC);

-- エラー追跡用
CREATE INDEX idx_search_history_error ON search_history(error_message) 
WHERE error_message IS NOT NULL;
```


### クエリパターンと対応インデックス

| クエリパターン | 使用インデックス | 説明 |
|------------|-------------|------|
| プロジェクト内検索 | idx_messages_project_timestamp | 特定プロジェクトの最新メッセージ取得 |
| タイプ別フィルタ | idx_messages_type_timestamp | user/assistantメッセージの分離検索 |
| セッション再現 | idx_messages_session_timestamp | 会話の流れを時系列で取得 |
| 複合条件検索 | idx_messages_project_type_timestamp | プロジェクト×タイプの絞り込み |
| 検索履歴サジェスト | idx_search_history_query | 部分一致によるクエリ補完 |
| 人気クエリ表示 | idx_search_stats_count | 使用頻度順のランキング |

### パフォーマンステスト計画

#### テストシナリオ
1. **大規模データセット**
   - 10,000セッション、100万メッセージでのベンチマーク
   - インデックス有無での比較測定

2. **主要クエリの実行時間測定**
   ```sql
   -- 測定対象クエリ例
   EXPLAIN QUERY PLAN
   SELECT * FROM messages 
   WHERE project_name = ? AND type = ?
   ORDER BY timestamp DESC LIMIT 20;
   ```

3. **インデックスサイズの監視**
   ```sql
   -- インデックス使用状況の確認
   SELECT name, tbl_name, sql 
   FROM sqlite_master 
   WHERE type = 'index';
   ```

#### パフォーマンス目標
- インデックス使用時：全クエリ100ms以内
- インデックスサイズ：データベース全体の30%以下
- 書き込み性能：1000メッセージ/秒以上

### インデックスメンテナンス

#### 定期的な最適化
```sql
-- 統計情報の更新
ANALYZE;

-- インデックスの再構築（断片化解消）
REINDEX;
```

#### 監視項目
1. **クエリ実行計画**：EXPLAIN QUERY PLANで定期確認
2. **インデックス使用率**：使われていないインデックスの検出
3. **データ分布の変化**：統計情報の定期更新

### インデックス追加のマイグレーション
```typescript
// src/database/migrations/003_add_indexes.ts
import { Migration } from '../types';

export const migration: Migration = {
  version: 3,
  name: 'add_indexes',
  up: async (db) => {
    await db.exec(`
      -- メッセージテーブルの追加インデックス
      CREATE INDEX IF NOT EXISTS idx_messages_project_type_timestamp 
      ON messages(project_name, type, timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_messages_parent_uuid 
      ON messages(parent_uuid) WHERE parent_uuid IS NOT NULL;
      
      -- 検索履歴の追加インデックス
      CREATE INDEX IF NOT EXISTS idx_search_history_mode_executed 
      ON search_history(mode, executed_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_search_history_error 
      ON search_history(error_message) WHERE error_message IS NOT NULL;
      
      -- 統計テーブルのインデックス
      CREATE INDEX IF NOT EXISTS idx_search_stats_count 
      ON search_history_stats(search_count DESC);
      
      CREATE INDEX IF NOT EXISTS idx_search_stats_last_executed 
      ON search_history_stats(last_executed_at DESC);
      
      -- 統計情報の更新
      ANALYZE;
    `);
  },
  down: async (db) => {
    await db.exec(`
      DROP INDEX IF EXISTS idx_messages_project_type_timestamp;
      DROP INDEX IF EXISTS idx_messages_parent_uuid;
      DROP INDEX IF EXISTS idx_search_history_mode_executed;
      DROP INDEX IF EXISTS idx_search_history_error;
      DROP INDEX IF EXISTS idx_search_stats_count;
      DROP INDEX IF EXISTS idx_search_stats_last_executed;
    `);
  }
};
```

## データベーススキーママイグレーション戦略

### 概要
Drizzle ORMを使用してデータベーススキーマの変更を安全かつ確実に適用する。軽量性を維持しながら、型安全性とマイグレーション管理を実現する。

### 技術スタック
- **ORM**: Drizzle ORM（軽量で高速、sqlite-vec対応）
- **SQLiteドライバ**: better-sqlite3
- **マイグレーション**: Drizzle Kit

### スキーマ定義
```typescript
// src/database/schema.ts
import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// メッセージテーブル
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  projectName: text('project_name').notNull(),
  messageUuid: text('message_uuid').notNull().unique(),
  parentUuid: text('parent_uuid'),
  type: text('type').notNull(), // 'user', 'assistant', 'summary'
  role: text('role'),
  content: text('content').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  sessionIdx: index('idx_messages_session_id').on(table.sessionId),
  projectTimestampIdx: index('idx_messages_project_timestamp').on(table.projectName, table.timestamp),
  typeIdx: index('idx_messages_type').on(table.type),
  projectTypeTimestampIdx: index('idx_messages_project_type_timestamp').on(table.projectName, table.type, table.timestamp),
  parentUuidIdx: index('idx_messages_parent_uuid').on(table.parentUuid).where(sql`${table.parentUuid} IS NOT NULL`)
}));

// 検索履歴テーブル
export const searchHistory = sqliteTable('search_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  query: text('query').notNull(),
  mode: text('mode').notNull(), // 'semantic', 'keyword', 'hybrid'
  options: text('options'), // JSON形式
  resultCount: integer('result_count').notNull(),
  executionTimeMs: integer('execution_time_ms'),
  embeddingModel: text('embedding_model'),
  errorMessage: text('error_message'),
  executedAt: integer('executed_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  executedAtIdx: index('idx_search_history_executed_at').on(table.executedAt),
  queryIdx: index('idx_search_history_query').on(table.query),
  modeExecutedIdx: index('idx_search_history_mode_executed').on(table.mode, table.executedAt),
  errorIdx: index('idx_search_history_error').on(table.errorMessage).where(sql`${table.errorMessage} IS NOT NULL`)
}));

// 統計は検索履歴テーブルから直接集計（統計専用テーブルは不要）

// ベクトルテーブル（sqlite-vec用、生SQLで作成）
export const createVectorTable = sql`
  CREATE VIRTUAL TABLE IF NOT EXISTS message_vectors USING vec0(
    message_id INTEGER PRIMARY KEY,
    embedding FLOAT[1536]
  );
`;
```

### データベース接続とマイグレーション
```typescript
// src/database/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

export class DatabaseManager {
  private sqlite: Database.Database;
  private db: ReturnType<typeof drizzle>;

  constructor(dbPath: string) {
    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite, { schema });
    
    // sqlite-vec拡張の読み込み
    this.loadVectorExtension();
  }

  private loadVectorExtension() {
    try {
      // プラットフォーム別のパスを解決
      const extensionPath = this.getVectorExtensionPath();
      this.sqlite.loadExtension(extensionPath);
      
      // ベクトルテーブルの作成
      this.db.run(schema.createVectorTable);
    } catch (error) {
      console.error('Failed to load sqlite-vec extension:', error);
      throw new Error('Vector search functionality unavailable');
    }
  }

  async runMigrations() {
    // Drizzle Kitで生成されたマイグレーションを実行
    await migrate(this.db, { migrationsFolder: './drizzle' });
  }

  // ベクトル検索用のヘルパーメソッド
  async vectorSearch(embedding: number[], limit: number = 10) {
    return this.db.all(sql`
      SELECT m.*, vec_distance(v.embedding, ${JSON.stringify(embedding)}) as distance
      FROM ${schema.messages} m
      JOIN message_vectors v ON m.id = v.message_id
      ORDER BY distance
      LIMIT ${limit}
    `);
  }
}
```

### Drizzle設定
```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/database/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: process.env.CCHISTORY_DB_PATH || '~/.claude/cchistory/db/claude-history.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### マイグレーション管理（シンプル化）

#### Drizzleのマイグレーション機能をそのまま活用
```typescript
// src/database/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

export class DatabaseManager {
  private sqlite: Database.Database;
  private db: ReturnType<typeof drizzle>;

  constructor(dbPath: string) {
    // ディレクトリの作成
    const dbDir = path.dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite, { schema });
    
    // 初期化
    this.initialize();
  }

  private async initialize() {
    // sqlite-vec拡張の読み込み
    await this.loadVectorExtension();
    
    // マイグレーション実行（Drizzle標準機能）
    // マイグレーションファイルはビルド時にバンドルされる
    await migrate(this.db, { 
      migrationsFolder: path.join(__dirname, 'migrations')
    });
  }

  private async loadVectorExtension() {
    try {
      // バイナリはnpmパッケージに含める
      const ext = process.platform === 'win32' ? '.dll' : '.so';
      const vecPath = path.join(__dirname, `../bin/vec0${ext}`);
      this.sqlite.loadExtension(vecPath);
    } catch (error) {
      // ベクトル検索なしでも動作可能にする
      console.warn('Vector search unavailable:', error.message);
    }
  }
}
```

#### 開発時のワークフロー
```bash
# スキーマ変更時
npm run db:generate  # マイグレーションファイル生成
npm run db:push     # 開発DBに適用

# ビルド時にマイグレーションファイルも含める
```

### 依存関係とパッケージサイズ
```json
{
  "dependencies": {
    "drizzle-orm": "^0.29.0",      // ~1.5MB
    "better-sqlite3": "^9.2.0",     // ~5MB (ネイティブ)
    "commander": "^11.0.0",         // ~200KB
    "openai": "^4.20.0"             // ~2MB
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0",       // ~5MB (開発時のみ)
    "@types/better-sqlite3": "^7.6.0",
    "typescript": "^5.0.0"
  }
}
```

合計: 実行時は約9MB（Prismaの1/5以下）

### Drizzleを選択した理由
1. **軽量性**: Prismaの1/10のサイズ
2. **sqlite-vec対応**: 拡張機能を簡単に利用可能
3. **高速起動**: エンジンプロセス不要
4. **型安全性**: TypeScriptの完全サポート
5. **柔軟性**: ORMと生SQLの混在使用が容易

## 今後の拡張機能（将来的な実装）
- エクスポート機能（検索結果をMarkdown/JSON形式で出力）
- インタラクティブモード（検索結果から選択して詳細表示）
- 統計情報表示（statsサブコマンド：プロジェクト別の会話数、頻出キーワード等）
- 複数言語対応（日本語・英語の混在検索）