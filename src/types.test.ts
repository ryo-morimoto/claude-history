import { describe, expect, it } from "vitest";
import {
  AppErrorSchema,
  ConfigSchema,
  ConversationRecordSchema,
  createAppError,
  EmbeddingRecordSchema,
  ErrorCode,
  MessageRecordSchema,
  SearchQuerySchema,
  SearchResultSchema,
} from "./types";

describe("Type Schemas", () => {
  describe("ConfigSchema", () => {
    it("should validate valid config", () => {
      const config = {
        openaiApiKey: "sk-test123",
        dataDir: "/home/user/.claude-history",
        embeddingModel: "text-embedding-3-small",
        chunkSize: 500,
        maxConcurrency: 10,
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openaiApiKey).toBe("sk-test123");
        expect(result.data.chunkSize).toBe(500);
      }
    });

    it("should provide default values", () => {
      const config = {
        openaiApiKey: "sk-test123",
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dataDir).toBe("~/.claude-history");
        expect(result.data.embeddingModel).toBe("text-embedding-3-small");
        expect(result.data.chunkSize).toBe(1000);
        expect(result.data.maxConcurrency).toBe(5);
      }
    });

    it("should reject missing API key", () => {
      const config = {
        openaiApiKey: "", // Empty string to trigger the min(1) validation
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("OpenAI API key is required");
      }
    });

    it("should reject invalid chunk size with helpful error", () => {
      const config = {
        openaiApiKey: "sk-test123",
        chunkSize: -100,
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Chunk size must be a positive integer");
      }
    });
  });

  describe("SearchQuerySchema", () => {
    it("should validate valid search query", () => {
      const query = {
        query: "How to use TypeScript",
        mode: "semantic" as const,
        limit: 20,
        threshold: 0.7,
      };

      const result = SearchQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe("How to use TypeScript");
        expect(result.data.mode).toBe("semantic");
      }
    });

    it("should use default values", () => {
      const query = {
        query: "test query",
      };

      const result = SearchQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe("hybrid");
        expect(result.data.limit).toBe(10);
        expect(result.data.threshold).toBeUndefined();
      }
    });

    it("should reject empty query with helpful error", () => {
      const query = {
        query: "",
      };

      const result = SearchQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Search query cannot be empty");
      }
    });

    it("should reject invalid limit with helpful error", () => {
      const query = {
        query: "test",
        limit: 150,
      };

      const result = SearchQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Limit cannot exceed 100");
      }
    });

    it("should reject invalid threshold with helpful error", () => {
      const query = {
        query: "test",
        threshold: 1.5,
      };

      const result = SearchQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Threshold must be between 0 and 1");
      }
    });
  });

  describe("SearchResultSchema", () => {
    it("should validate valid search result", () => {
      const result = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        content: "This is the search result content",
        score: 0.85,
        metadata: {
          conversationId: "conv-123",
          timestamp: "2024-01-01T12:00:00Z",
          role: "assistant" as const,
          turn: 5,
        },
      };

      const parsed = SearchResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it("should reject invalid UUID with helpful error", () => {
      const result = {
        id: "not-a-uuid",
        content: "content",
        score: 0.5,
        metadata: {
          conversationId: "conv-123",
          timestamp: "2024-01-01T12:00:00Z",
          role: "user" as const,
          turn: 0,
        },
      };

      const parsed = SearchResultSchema.safeParse(result);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe("Invalid result ID");
      }
    });

    it("should reject invalid timestamp with helpful error", () => {
      const result = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        content: "content",
        score: 0.5,
        metadata: {
          conversationId: "conv-123",
          timestamp: "not-a-timestamp",
          role: "user" as const,
          turn: 0,
        },
      };

      const parsed = SearchResultSchema.safeParse(result);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe("Invalid timestamp format");
      }
    });
  });

  describe("Database Record Schemas", () => {
    it("should validate ConversationRecord", () => {
      const record = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Test Conversation",
        createdAt: "2024-01-01T12:00:00Z",
        updatedAt: "2024-01-01T13:00:00Z",
      };

      const result = ConversationRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it("should validate MessageRecord", () => {
      const record = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        conversationId: "123e4567-e89b-12d3-a456-426614174001",
        role: "user" as const,
        content: "Hello, world!",
        turn: 0,
        createdAt: "2024-01-01T12:00:00Z",
      };

      const result = MessageRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it("should validate EmbeddingRecord", () => {
      const record = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        messageId: "123e4567-e89b-12d3-a456-426614174001",
        embedding: new Float32Array([0.1, 0.2, 0.3]),
        model: "text-embedding-3-small",
        createdAt: "2024-01-01T12:00:00Z",
      };

      const result = EmbeddingRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });
  });

  describe("AppError", () => {
    it("should validate AppError with ErrorCode enum", () => {
      const error = {
        code: ErrorCode.DatabaseError,
        message: "Failed to connect to database",
        cause: new Error("Connection timeout"),
      };

      const result = AppErrorSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it("should reject invalid error code", () => {
      const error = {
        code: "INVALID_CODE",
        message: "Some error",
      };

      const result = AppErrorSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it("should create AppError with helper", () => {
      const error = createAppError(ErrorCode.DatabaseError, "Database connection failed");

      expect(error.code).toBe(ErrorCode.DatabaseError);
      expect(error.message).toBe("Database connection failed");
      expect(error.cause).toBeUndefined();
    });

    it("should create AppError with cause", () => {
      const cause = new Error("Original error");
      const error = createAppError(ErrorCode.ApiError, "Request failed", cause);

      expect(error.code).toBe(ErrorCode.ApiError);
      expect(error.message).toBe("Request failed");
      expect(error.cause).toBe(cause);
    });
  });

  describe("Zod Error Messages", () => {
    it("should provide multiple validation errors", () => {
      const config = {
        openaiApiKey: "",
        chunkSize: -1,
        maxConcurrency: 0,
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message);
        expect(messages).toContain("OpenAI API key is required");
        expect(messages).toContain("Chunk size must be a positive integer");
        expect(messages).toContain("Max concurrency must be a positive integer");
      }
    });
  });
});
