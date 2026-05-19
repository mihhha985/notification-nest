export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<
  Pick<
    RetryOptions,
    'maxAttempts' | 'initialDelayMs' | 'maxDelayMs' | 'backoffMultiplier'
  >
> = {
  maxAttempts: 5,
  initialDelayMs: 500,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isRetryableConnectionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return true;
  }

  const retryableCodes = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EPIPE',
    'ENOTFOUND',
  ];

  const code = (error as NodeJS.ErrnoException).code;
  if (code && retryableCodes.includes(code)) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('connection') ||
    message.includes('socket') ||
    message.includes('timeout') ||
    message.includes('broker')
  );
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
  } = { ...DEFAULT_OPTIONS, ...options };

  const shouldRetry = options.shouldRetry ?? isRetryableConnectionError;
  let delay = initialDelayMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}
