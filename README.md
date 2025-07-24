# cchistory - Claude Code History Search

[![CI](https://github.com/ryo-morimoto/claude-history/actions/workflows/ci.yml/badge.svg)](https://github.com/ryo-morimoto/claude-history/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/cchistory.svg)](https://badge.fury.io/js/cchistory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI-powered semantic search for Claude Code conversation history.

> **Note**: This project is in the design phase. For a working implementation, please use [ccsearch](https://github.com/suthio/ccsearch) by @suthio.

## Features

- 🔍 **Hybrid Search**: Combines semantic (AI) and keyword search for best results
- 🚀 **Fast**: Built with Rust-based tools (oxlint, biome, tsdown)
- 💾 **Local Storage**: SQLite with vector search capabilities
- 🎯 **Type-Safe**: Full TypeScript with Result types error handling
- 🌐 **Cross-Platform**: Works on macOS, Linux, and Windows

## Installation

```bash
# Install globally with npm
npm install -g cchistory

# Or use directly with npx
npx cchistory
```

## Usage

### Initial Setup

```bash
# Initialize database and create search index
cchistory init
```

### Search

```bash
# Search with default hybrid mode
cchistory "リファクタリング"

# Semantic search only (AI-powered)
cchistory "コードの改善" --mode semantic

# Keyword search only
cchistory "refactor" --mode keyword

# Filter by project
cchistory "バグ修正" --project "my-project"

# Show more results
cchistory "エラー処理" --limit 20
```

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 10.13.1

### Setup

```bash
# Clone repository
git clone https://github.com/ryo-morimoto/claude-history.git
cd claude-history

# Install dependencies
pnpm install

# Run in development mode
pnpm dev
```

### Scripts

- `pnpm build` - Build for production
- `pnpm dev` - Run in development mode
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate coverage report
- `pnpm check` - Run all checks (type, lint, format)
- `pnpm lint` - Run linters (oxlint + biome)
- `pnpm format` - Format code with biome

### Error Handling

This project uses Result types (neverthrow) for error handling. All functions that can fail return `Result<T, E>` instead of throwing exceptions.

## Configuration

Configuration file is located at `~/.claude/cchistory/config.yml`

```yaml
api:
  openai_key: "sk-..."

search:
  limit: 10
  context: 3

exclude:
  projects:
    - "test-*"
```

## License

MIT © Ryo Morimoto
