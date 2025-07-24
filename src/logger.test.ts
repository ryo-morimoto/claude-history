import { describe, expect, it, vi } from "vitest";
import { logError } from "./logger";

describe("Logger", () => {
  describe("logError", () => {
    it("should log error without context and return Result.err", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Empty mock implementation
      });
      const error = new Error("test error");

      const result = logError(error);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(error);
      expect(consoleSpy).toHaveBeenCalledWith(error);
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it("should log error with context and return Result.err", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Empty mock implementation
      });
      const error = new Error("test error");
      const context = "TestContext";

      const result = logError(error, context);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(error);
      expect(consoleSpy).toHaveBeenCalledWith(`[${context}]`, error);
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it("should work with custom error types", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Empty mock implementation
      });
      const customError = { code: "CUSTOM_ERROR", message: "Custom error message" };

      const result = logError(customError, "CustomContext");

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(customError);
      expect(consoleSpy).toHaveBeenCalledWith("[CustomContext]", customError);

      consoleSpy.mockRestore();
    });
  });
});
