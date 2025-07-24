# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`claude-history` (cchistory) is a CLI tool that enables natural language search of Claude Code conversation history. Currently in the design phase with implementation not yet started.

## Error Handling Policy

This project follows a strict no-exceptions design policy:

- **NEVER throw exceptions** in application code
- **ALWAYS use Result types** for error handling instead of throwing
- **ALL functions that can fail** must return `Result<T, E>` instead of throwing
- Use explicit error handling over implicit exception propagation

### Result Type Implementation

This project uses the **neverthrow** library for Result types:

- Import: `import { Result, ok, err } from "neverthrow"`
- Use `result.isOk()` and `result.isErr()` for type checking
- Use `result.match()` for pattern matching
- Use `ResultAsync` for async operations

### Mandatory Practices

1. **Function Return Types**: All functions that can fail must return `Result<SuccessType, ErrorType>`
2. **Error Checking**: Always use `result.isOk()` / `result.isErr()` for type-safe error checking
3. **No Exception Throwing**: Never use `throw` statements in application code
4. **Async Operations**: Use `ResultAsync` for async operations
5. **External Libraries**: Wrap third-party code that might throw using `Result.fromThrowable()` or `ResultAsync.fromPromise()`

## Technical Stack

- **Database**: SQLite + sqlite-vec extension (NOT Drizzle ORM - use better-sqlite3 directly)
- **Vector Search**: OpenAI Embeddings API via @vercel/ai SDK
- **CLI Framework**: Commander.js
- **Package Manager**: pnpm
- **Architecture**: Single package structure (not monorepo)

## Key Design Documents

1. **REQUIREMENT.md**: Full feature requirements
2. **DESIGN_V1.md**: MVP technical design (3-4 week implementation)
3. **DESIGN_V2.md**: Extended features for v2.0
4. **MEMO.md**: Critical technical decisions
5. **docs/claude-code-jsonl-format.md**: Claude Code's JSONL format

## Development Commands

*To be added once package.json is created*

## Git Commit Convention

Always use Conventional Commits format. Use `/commit` command to create commits with proper format.

## Architecture

### Folder Structure
```
src/
├── commands/       # CLI commands
├── search/         # Search functionality
├── indexing/       # Index creation
├── storage/        # Data persistence
├── config/         # Configuration
├── types.ts        # Type definitions
└── cli.ts          # Entry point
```

### Key Implementation Notes

1. **DO NOT use Drizzle ORM** - sqlite-vec incompatibility
2. Search modes: semantic, keyword, hybrid (default)
3. API key: env var → config file → interactive prompt