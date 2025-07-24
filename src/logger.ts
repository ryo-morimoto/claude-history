/**
 * Logging utilities for the application
 */
import { err, type Result } from "neverthrow";

/**
 * Logs an error and returns it as a Result.err
 */
export function logError<E>(error: E, context?: string): Result<never, E> {
  if (context) {
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, error);
  } else {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return err(error);
}
