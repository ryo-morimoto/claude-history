/**
 * Application error types following Result pattern
 */

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

// Database errors
export const DatabaseError = {
  ConnectionFailed: (details?: unknown): AppError => ({
    code: "DB_CONNECTION_FAILED",
    message: "Failed to connect to database",
    details,
  }),
  QueryFailed: (query: string, details?: unknown): AppError => ({
    code: "DB_QUERY_FAILED",
    message: `Database query failed: ${query}`,
    details,
  }),
  TransactionFailed: (details?: unknown): AppError => ({
    code: "DB_TRANSACTION_FAILED",
    message: "Database transaction failed",
    details,
  }),
} as const;

// API errors
export const ApiError = {
  AuthenticationFailed: (details?: unknown): AppError => ({
    code: "API_AUTH_FAILED",
    message: "API authentication failed",
    details,
  }),
  RateLimitExceeded: (retryAfter?: number): AppError => ({
    code: "API_RATE_LIMIT",
    message: "API rate limit exceeded",
    details: { retryAfter },
  }),
  NetworkError: (details?: unknown): AppError => ({
    code: "API_NETWORK_ERROR",
    message: "Network request failed",
    details,
  }),
} as const;

// File system errors
export const FileSystemError = {
  FileNotFound: (path: string): AppError => ({
    code: "FS_FILE_NOT_FOUND",
    message: `File not found: ${path}`,
    details: { path },
  }),
  AccessDenied: (path: string): AppError => ({
    code: "FS_ACCESS_DENIED",
    message: `Access denied: ${path}`,
    details: { path },
  }),
  ReadError: (path: string, details?: unknown): AppError => ({
    code: "FS_READ_ERROR",
    message: `Failed to read file: ${path}`,
    details,
  }),
} as const;

// Configuration errors
export const ConfigError = {
  MissingApiKey: (): AppError => ({
    code: "CONFIG_MISSING_API_KEY",
    message: "OpenAI API key not found. Please set OPENAI_API_KEY or run cchistory init",
  }),
  InvalidConfig: (details?: unknown): AppError => ({
    code: "CONFIG_INVALID",
    message: "Invalid configuration",
    details,
  }),
} as const;

// Search errors
export const SearchError = {
  InvalidQuery: (query: string): AppError => ({
    code: "SEARCH_INVALID_QUERY",
    message: `Invalid search query: ${query}`,
    details: { query },
  }),
  NoResults: (): AppError => ({
    code: "SEARCH_NO_RESULTS",
    message: "No results found",
  }),
} as const;
