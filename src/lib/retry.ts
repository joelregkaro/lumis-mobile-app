const INITIAL_DELAY_MS = 500;
const MAX_DELAY_MS = 8000;
const MAX_RETRIES = 3;

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  let lastError: unknown;
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, MAX_DELAY_MS);
      }
    }
  }

  throw lastError;
}
