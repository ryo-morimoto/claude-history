# Claude Code JSONL ログフォーマット分析

## 概要
Claude CodeのログはJSONL（JSON Lines）形式で保存され、各行が1つのイベントを表します。

## 主要なログタイプ

### 1. summary タイプ
会話の要約を保存します。
```json
{
  "type": "summary",
  "summary": "要約テキスト",
  "leafUuid": "UUID"
}
```

### 2. user タイプ
ユーザーからの入力を記録します。
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "メッセージ内容"
  },
  "parentUuid": "親メッセージのUUID",
  "uuid": "このメッセージのUUID",
  "timestamp": "ISO8601形式のタイムスタンプ",
  "sessionId": "セッションID",
  "cwd": "作業ディレクトリ",
  "gitBranch": "Gitブランチ名",
  "version": "Claude Codeバージョン",
  "userType": "external",
  "isSidechain": false
}
```

### 3. assistant タイプ
Claudeの応答を記録します。
```json
{
  "type": "assistant",
  "message": {
    "id": "msg_xxx",
    "type": "message",
    "role": "assistant",
    "model": "claude-opus-4-20250514",
    "content": [
      {
        "type": "text",
        "text": "応答テキスト"
      },
      {
        "type": "tool_use",
        "id": "toolu_xxx",
        "name": "ツール名",
        "input": {...}
      }
    ],
    "usage": {
      "input_tokens": N,
      "output_tokens": N,
      "cache_creation_input_tokens": N,
      "cache_read_input_tokens": N,
      "service_tier": "standard"
    }
  },
  "requestId": "req_xxx",
  "parentUuid": "親UUID",
  "uuid": "UUID",
  "timestamp": "タイムスタンプ"
}
```

### 4. system タイプ
システムメッセージやツール実行結果を記録します。
```json
{
  "type": "system",
  "content": "システムメッセージ",
  "level": "info|warning|error",
  "toolUseID": "関連するツール使用ID",
  "isMeta": false,
  "parentUuid": "親UUID",
  "uuid": "UUID",
  "timestamp": "タイムスタンプ"
}
```

## 特殊なパターン

### コマンド実行（!コマンド）
ユーザーがClaude Code内でコマンドを実行する際の記録：
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "<command-name>/clear</command-name>\n<command-message>clear</command-message>\n<command-args></command-args>"
  }
}
```

実行結果：
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "<local-command-stdout>実行結果</local-command-stdout>"
  }
}
```

### ツール実行結果
TodoWriteなどのツール実行結果を含む場合：
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "tool_use_id": "toolu_xxx",
        "type": "tool_result",
        "content": "結果メッセージ"
      }
    ]
  },
  "toolUseResult": {
    "oldTodos": [...],
    "newTodos": [...]
  }
}
```

### Hooks実行
設定されたhooksの実行記録：
```json
{
  "type": "system",
  "content": "\u001b[1mStop\u001b[22m [echo 'Check TODOs and **continue working** on any uncompleted tasks.'] completed successfully: Check TODOs and **continue working** on any uncompleted tasks.",
  "level": "info",
  "toolUseID": "関連ID"
}
```

## 階層構造
- 各メッセージは`parentUuid`で親メッセージを参照
- `parentUuid: null`はセッションの開始点
- ツール実行の流れ：assistant → tool_use → user(tool_result) → assistant

## メタ情報
- `isMeta: true`: システムメタ情報（ユーザーには表示されない）
- `isSidechain`: サイドチェイン会話かどうか（通常はfalse）
- `userType`: "external"が通常のユーザー

## 活用可能性
1. **会話履歴の完全な再現**: UUID連鎖による正確な再生
2. **ツール使用パターン分析**: どのツールがどのような文脈で使われるか
3. **エラー追跡**: systemタイプのerrorレベルメッセージ
4. **パフォーマンス分析**: トークン使用量とキャッシュ効率
5. **ユーザー行動分析**: コマンド使用頻度や作業パターン