/**
 * Result type for safe error handling without exceptions
 */

// Base Result type
export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly kind: 'success';
  readonly value: T;
}

export interface Failure<E> {
  readonly kind: 'failure';
  readonly error: E;
}

// Factory functions
export const success = <T>(value: T): Success<T> => ({
  kind: 'success',
  value,
});

export const failure = <E>(error: E): Failure<E> => ({
  kind: 'failure',
  error,
});

// Type guards
export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> => {
  return result.kind === 'success';
};

export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> => {
  return result.kind === 'failure';
};

// Utility functions for Result
export class ResultUtils {
  /**
   * Maps the success value of a Result
   */
  static map<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    return isSuccess(result) ? success(fn(result.value)) : result;
  }

  /**
   * Maps the error value of a Result
   */
  static mapError<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> {
    return isFailure(result) ? failure(fn(result.error)) : result;
  }

  /**
   * Chains Results together (flatMap)
   */
  static chain<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
  ): Result<U, E> {
    return isSuccess(result) ? fn(result.value) : result;
  }

  /**
   * Combines multiple Results into one
   */
  static combine<T extends readonly unknown[], E>(
    results: { [K in keyof T]: Result<T[K], E> }
  ): Result<T, E> {
    const values: unknown[] = [];
    
    for (const result of results) {
      if (isFailure(result)) {
        return result;
      }
      values.push(result.value);
    }
    
    return success(values as T);
  }

  /**
   * Gets the value or throws if error
   */
  static unwrap<T, E>(result: Result<T, E>): T {
    if (isSuccess(result)) {
      return result.value;
    }
    throw result.error;
  }

  /**
   * Gets the value or returns default
   */
  static unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return isSuccess(result) ? result.value : defaultValue;
  }

  /**
   * Gets the value or computes default
   */
  static unwrapOrElse<T, E>(
    result: Result<T, E>,
    fn: (error: E) => T
  ): T {
    return isSuccess(result) ? result.value : fn(result.error);
  }

  /**
   * Converts a throwing function to return a Result
   */
  static fromThrowable<T, E = Error>(
    fn: () => T,
    errorMapper?: (error: unknown) => E
  ): Result<T, E> {
    try {
      return success(fn());
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as E);
      return failure(mappedError);
    }
  }

  /**
   * Converts an async throwing function to return a Result
   */
  static async fromAsyncThrowable<T, E = Error>(
    fn: () => Promise<T>,
    errorMapper?: (error: unknown) => E
  ): Promise<Result<T, E>> {
    try {
      const value = await fn();
      return success(value);
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as E);
      return failure(mappedError);
    }
  }

  /**
   * Filters a Result based on a predicate
   */
  static filter<T, E>(
    result: Result<T, E>,
    predicate: (value: T) => boolean,
    errorOnFalse: E
  ): Result<T, E> {
    if (isSuccess(result) && !predicate(result.value)) {
      return failure(errorOnFalse);
    }
    return result;
  }

  /**
   * Applies a function to Result if it's a success
   */
  static tap<T, E>(
    result: Result<T, E>,
    fn: (value: T) => void
  ): Result<T, E> {
    if (isSuccess(result)) {
      fn(result.value);
    }
    return result;
  }

  /**
   * Applies a function to Result if it's a failure
   */
  static tapError<T, E>(
    result: Result<T, E>,
    fn: (error: E) => void
  ): Result<T, E> {
    if (isFailure(result)) {
      fn(result.error);
    }
    return result;
  }

  /**
   * Converts a Promise<Result<T, E>> to a Result<T, E> by catching promise rejections
   */
  static async fromPromise<T, E = Error>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => E
  ): Promise<Result<T, E>> {
    try {
      const value = await promise;
      return success(value);
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as E);
      return failure(mappedError);
    }
  }

  /**
   * Collects all success values and first error
   */
  static collect<T, E>(
    results: readonly Result<T, E>[]
  ): Result<readonly T[], E> {
    const values: T[] = [];
    
    for (const result of results) {
      if (isFailure(result)) {
        return result;
      }
      values.push(result.value);
    }
    
    return success(values);
  }

  /**
   * Partitions results into successes and failures
   */
  static partition<T, E>(
    results: readonly Result<T, E>[]
  ): {
    readonly successes: readonly T[];
    readonly failures: readonly E[];
  } {
    const successes: T[] = [];
    const failures: E[] = [];
    
    for (const result of results) {
      if (isSuccess(result)) {
        successes.push(result.value);
      } else {
        failures.push(result.error);
      }
    }
    
    return { successes, failures };
  }
}

// Async Result utilities
export class AsyncResultUtils {
  /**
   * Maps over an async Result
   */
  static async map<T, U, E>(
    resultPromise: Promise<Result<T, E>>,
    fn: (value: T) => U | Promise<U>
  ): Promise<Result<U, E>> {
    const result = await resultPromise;
    if (isSuccess(result)) {
      const mappedValue = await fn(result.value);
      return success(mappedValue);
    }
    return result;
  }

  /**
   * Chains async Results
   */
  static async chain<T, U, E>(
    resultPromise: Promise<Result<T, E>>,
    fn: (value: T) => Promise<Result<U, E>>
  ): Promise<Result<U, E>> {
    const result = await resultPromise;
    return isSuccess(result) ? fn(result.value) : result;
  }

  /**
   * Combines multiple async Results
   */
  static async combine<T extends readonly unknown[], E>(
    resultPromises: { [K in keyof T]: Promise<Result<T[K], E>> }
  ): Promise<Result<T, E>> {
    const results = await Promise.all(resultPromises);
    return ResultUtils.combine(results);
  }

  /**
   * Applies side effect to async Result
   */
  static async tap<T, E>(
    resultPromise: Promise<Result<T, E>>,
    fn: (value: T) => void | Promise<void>
  ): Promise<Result<T, E>> {
    const result = await resultPromise;
    if (isSuccess(result)) {
      await fn(result.value);
    }
    return result;
  }
}

// AppError class for application errors
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Convenience namespace for Result with ok/err static methods
export const Result = {
  ok<T>(value: T): Success<T> & ResultMethods<T, never> {
    return successWithMethods(value);
  },
  
  err<E>(error: E): Failure<E> & ResultMethods<never, E> {
    return failureWithMethods(error);
  },
  
  isOk<T, E>(result: Result<T, E>): result is Success<T> {
    return isSuccess(result);
  },
  
  isErr<T, E>(result: Result<T, E>): result is Failure<E> {
    return isFailure(result);
  }
} as const;

// Extend Result type with methods
export interface ResultMethods<T, E> {
  isOk(): this is Success<T>;
  isErr(): this is Failure<E>;
}

// Add methods to Success and Failure objects
export const successWithMethods = <T>(value: T): Success<T> & ResultMethods<T, never> => {
  const result = success(value) as Success<T> & ResultMethods<T, never>;
  result.isOk = () => true;
  result.isErr = () => false;
  return result;
};

export const failureWithMethods = <E>(error: E): Failure<E> & ResultMethods<never, E> => {
  const result = failure(error) as Failure<E> & ResultMethods<never, E>;
  result.isOk = () => false;
  result.isErr = () => true;
  return result;
};