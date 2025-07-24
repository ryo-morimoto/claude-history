import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import type { AppError } from "../error.js";
import { combineResults, logError, wrapAsyncThrowable, wrapThrowable } from "./result-helpers.js";

describe("result-helpers", () => {
  describe("wrapThrowable", () => {
    it("should return ok when function succeeds", () => {
      const fn = () => 42;
      const errorMapper = (error: unknown): AppError => ({
        type: "UNEXPECTED_ERROR",
        message: String(error),
      });

      const result = wrapThrowable(fn, errorMapper);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(42);
    });

    it("should return err when function throws", () => {
      const fn = () => {
        throw new Error("Test error");
      };
      const errorMapper = (error: unknown): AppError => ({
        type: "UNEXPECTED_ERROR",
        message: error instanceof Error ? error.message : String(error),
      });

      const result = wrapThrowable(fn, errorMapper);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toEqual({
        type: "UNEXPECTED_ERROR",
        message: "Test error",
      });
    });
  });

  describe("wrapAsyncThrowable", () => {
    it("should return ok when async function succeeds", async () => {
      const fn = () => Promise.resolve(42);
      const errorMapper = (error: unknown): AppError => ({
        type: "UNEXPECTED_ERROR",
        message: String(error),
      });

      const result = await wrapAsyncThrowable(fn, errorMapper);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(42);
    });

    it("should return err when async function rejects", async () => {
      const fn = () => Promise.reject(new Error("Async test error"));
      const errorMapper = (error: unknown): AppError => ({
        type: "UNEXPECTED_ERROR",
        message: error instanceof Error ? error.message : String(error),
      });

      const result = await wrapAsyncThrowable(fn, errorMapper);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toEqual({
        type: "UNEXPECTED_ERROR",
        message: "Async test error",
      });
    });
  });

  describe("combineResults", () => {
    it("should return ok with all values when all results are ok", () => {
      const results = [ok(1), ok(2), ok(3)];

      const combined = combineResults(results);

      expect(combined.isOk()).toBe(true);
      expect(combined._unsafeUnwrap()).toEqual([1, 2, 3]);
    });

    it("should return first error when any result is err", () => {
      const error1: AppError = { type: "UNEXPECTED_ERROR", message: "Error 1" };
      const error2: AppError = { type: "UNEXPECTED_ERROR", message: "Error 2" };
      const results = [ok(1), err(error1), ok(3), err(error2)];

      const combined = combineResults(results);

      expect(combined.isErr()).toBe(true);
      expect(combined._unsafeUnwrapErr()).toEqual(error1);
    });

    it("should handle empty array", () => {
      const results: never[] = [];

      const combined = combineResults(results);

      expect(combined.isOk()).toBe(true);
      expect(combined._unsafeUnwrap()).toEqual([]);
    });
  });

  describe("logError", () => {
    it("should log error without context and return err", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Empty mock implementation
      });
      const error: AppError = { type: "UNEXPECTED_ERROR", message: "Test error" };

      const result = logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toEqual(error);

      consoleErrorSpy.mockRestore();
    });

    it("should log error with context and return err", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Empty mock implementation
      });
      const error: AppError = { type: "UNEXPECTED_ERROR", message: "Test error" };
      const context = "TestContext";

      const result = logError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`[${context}]`, error);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toEqual(error);

      consoleErrorSpy.mockRestore();
    });
  });
});
