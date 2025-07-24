import { z } from "zod";

/* Configuration */

/**
 * Application configuration schema.
 * Defines the structure and validation rules for the application settings.
 */
export const ConfigSchema = z.object({
  /**
   * OpenAI API key for generating embeddings.
   * Required for semantic search functionality.
   */
  openaiApiKey: z.string().min(1, "OpenAI API key is required"),

  /**
   * Directory path where the application data is stored.
   * @default '~/.claude-history'
   */
  dataDir: z.string().default("~/.claude-history"),

  /**
   * OpenAI embedding model to use for text vectorization.
   * @default 'text-embedding-3-small'
   */
  embeddingModel: z.string().default("text-embedding-3-small"),

  /**
   * Size of text chunks for embedding generation.
   * Larger chunks provide more context but may be less precise.
   * @default 1000
   */
  chunkSize: z.number().int().positive("Chunk size must be a positive integer").default(1000),

  /**
   * Maximum number of concurrent operations for indexing.
   * Higher values speed up processing but use more resources.
   * @default 5
   */
  maxConcurrency: z
    .number()
    .int()
    .positive("Max concurrency must be a positive integer")
    .default(5),
});

/* Search */

/**
 * Search query parameters schema.
 * Defines the structure for search requests.
 */
export const SearchQuerySchema = z.object({
  /**
   * The search query string.
   * Cannot be empty.
   */
  query: z.string().min(1, "Search query cannot be empty"),

  /**
   * Search mode to use.
   * - 'semantic': Uses AI embeddings for meaning-based search
   * - 'keyword': Traditional text matching
   * - 'hybrid': Combines both semantic and keyword search
   * @default 'hybrid'
   */
  mode: z.enum(["semantic", "keyword", "hybrid"]).default("hybrid"),

  /**
   * Maximum number of results to return.
   * @default 10
   * @minimum 1
   * @maximum 100
   */
  limit: z
    .number()
    .int()
    .positive("Limit must be positive")
    .max(100, "Limit cannot exceed 100")
    .default(10),

  /**
   * Minimum similarity score threshold for semantic search.
   * Results with scores below this threshold are filtered out.
   * @minimum 0
   * @maximum 1
   */
  threshold: z
    .number()
    .min(0, "Threshold must be between 0 and 1")
    .max(1, "Threshold must be between 0 and 1")
    .optional(),
});

/**
 * Search result schema.
 * Represents a single search result with metadata.
 */
export const SearchResultSchema = z.object({
  /**
   * Unique identifier for the search result.
   * Must be a valid UUID.
   */
  id: z.string().uuid("Invalid result ID"),

  /**
   * The content of the search result.
   * Cannot be empty.
   */
  content: z.string().min(1, "Content cannot be empty"),

  /**
   * Relevance score of the result.
   * Higher scores indicate better matches.
   * @minimum 0
   * @maximum 1
   */
  score: z.number().min(0, "Score must be non-negative").max(1, "Score must be at most 1"),

  /**
   * Metadata associated with the search result.
   */
  metadata: z.object({
    /**
     * ID of the conversation this result belongs to.
     */
    conversationId: z.string().min(1, "Conversation ID is required"),

    /**
     * ISO 8601 timestamp when the message was created.
     */
    timestamp: z.string().datetime("Invalid timestamp format"),

    /**
     * Role of the message author.
     */
    role: z.enum(["user", "assistant"]),

    /**
     * Turn number in the conversation.
     * @minimum 0
     */
    turn: z.number().int().nonnegative("Turn must be non-negative"),
  }),
});

/* Database records */

/**
 * Conversation record schema.
 * Represents a Claude Code conversation in the database.
 */
export const ConversationRecordSchema = z.object({
  /**
   * Unique identifier for the conversation.
   * Must be a valid UUID.
   */
  id: z.string().uuid(),

  /**
   * Title or summary of the conversation.
   */
  title: z.string(),

  /**
   * ISO 8601 timestamp when the conversation was created.
   */
  createdAt: z.string().datetime(),

  /**
   * ISO 8601 timestamp when the conversation was last updated.
   */
  updatedAt: z.string().datetime(),
});

/**
 * Message record schema.
 * Represents a single message within a conversation.
 */
export const MessageRecordSchema = z.object({
  /**
   * Unique identifier for the message.
   * Must be a valid UUID.
   */
  id: z.string().uuid(),

  /**
   * ID of the conversation this message belongs to.
   * Must be a valid UUID.
   */
  conversationId: z.string().uuid(),

  /**
   * Role of the message author.
   */
  role: z.enum(["user", "assistant"]),

  /**
   * Content of the message.
   */
  content: z.string(),

  /**
   * Turn number in the conversation.
   * @minimum 0
   */
  turn: z.number().int().nonnegative(),

  /**
   * ISO 8601 timestamp when the message was created.
   */
  createdAt: z.string().datetime(),
});

/**
 * Embedding record schema.
 * Stores vector embeddings for messages to enable semantic search.
 */
export const EmbeddingRecordSchema = z.object({
  /**
   * Unique identifier for the embedding.
   * Must be a valid UUID.
   */
  id: z.string().uuid(),

  /**
   * ID of the message this embedding represents.
   * Must be a valid UUID.
   */
  messageId: z.string().uuid(),

  /**
   * Vector embedding data.
   * Stored as a Float32Array for efficient computation.
   */
  embedding: z.instanceof(Float32Array),

  /**
   * Name of the model used to generate this embedding.
   */
  model: z.string(),

  /**
   * ISO 8601 timestamp when the embedding was created.
   */
  createdAt: z.string().datetime(),
});

/* Errors */

/**
 * Error codes for application errors.
 * Used to categorize different types of errors that can occur.
 */
export enum ErrorCode {
  /** Database connection, query, or transaction errors */
  DatabaseError = "DATABASE_ERROR",

  /** API authentication, rate limiting, or network errors */
  ApiError = "API_ERROR",

  /** File not found, access denied, or I/O errors */
  FileSystemError = "FILE_SYSTEM_ERROR",

  /** Configuration validation or missing required settings */
  ConfigError = "CONFIG_ERROR",

  /** Input validation or data format errors */
  ValidationError = "VALIDATION_ERROR",

  /** Unexpected errors that don't fit other categories */
  UnknownError = "UNKNOWN_ERROR",
}

/**
 * Application error schema.
 * Standard error structure for consistent error handling.
 */
export const AppErrorSchema = z.object({
  /**
   * Error code indicating the type of error.
   */
  code: z.nativeEnum(ErrorCode),

  /**
   * Human-readable error message.
   */
  message: z.string(),

  /**
   * Optional underlying cause of the error.
   * Can be another Error object or any relevant data.
   */
  cause: z.unknown().optional(),
});

/* Helper functions */

/**
 * Creates an application error with the specified code and message.
 *
 * @param code - The error code from the ErrorCode enum
 * @param message - Human-readable error message
 * @param cause - Optional underlying cause of the error
 * @returns An AppError object
 *
 * @example
 * ```typescript
 * const error = createAppError(
 *   ErrorCode.DatabaseError,
 *   'Failed to connect to database',
 *   new Error('Connection timeout')
 * );
 * ```
 */
export function createAppError(code: ErrorCode, message: string, cause?: unknown): AppError {
  return { code, message, cause };
}

/* Configuration types */

/**
 * Application configuration type.
 * @see {@link ConfigSchema}
 */
export type Config = z.infer<typeof ConfigSchema>;

/* Search types */

/**
 * Search query parameters type.
 * @see {@link SearchQuerySchema}
 */
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/**
 * Search result type.
 * @see {@link SearchResultSchema}
 */
export type SearchResult = z.infer<typeof SearchResultSchema>;

/* Database record types */

/**
 * Conversation record type.
 * @see {@link ConversationRecordSchema}
 */
export type ConversationRecord = z.infer<typeof ConversationRecordSchema>;

/**
 * Message record type.
 * @see {@link MessageRecordSchema}
 */
export type MessageRecord = z.infer<typeof MessageRecordSchema>;

/**
 * Embedding record type.
 * @see {@link EmbeddingRecordSchema}
 */
export type EmbeddingRecord = z.infer<typeof EmbeddingRecordSchema>;

/* Error types */

/**
 * Application error type.
 * @see {@link AppErrorSchema}
 */
export type AppError = z.infer<typeof AppErrorSchema>;
