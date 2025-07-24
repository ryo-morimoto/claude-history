/**
 * Helper functions for working with Result types
 */
import { Result, ResultAsync, ok, err } from 'neverthrow';
import type { AppError } from '../error.js';

/**
 * Wraps a synchronous function that might throw into a Result
 */
export function wrapThrowable<T, E = AppError>(
  fn: () => T,
  errorMapper: (error: unknown) => E,
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(errorMapper(error));
  }
}

/**
 * Wraps an async function that might throw into a ResultAsync
 */
export function wrapAsyncThrowable<T, E = AppError>(
  fn: () => Promise<T>,
  errorMapper: (error: unknown) => E,
): ResultAsync<T, E> {
  return ResultAsync.fromPromise(fn(), errorMapper);
}

/**
 * Combines multiple Results into a single Result
 * If any Result is an error, returns the first error
 */
export function combineResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const errors = results.filter((r) => r.isErr());
  if (errors.length > 0) {
    return errors[0] as Result<never, E>;
  }
  
  const values = results.map((r) => (r as Result<T, never>).value);
  return ok(values);
}

/**
 * Logs an error and returns it as a Result.err
 */
export function logError<E>(error: E, context?: string): Result<never, E> {
  if (context) {
    console.error(`[${context}]`, error);
  } else {
    console.error(error);
  }
  return err(error);
}