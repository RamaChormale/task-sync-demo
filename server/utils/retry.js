/**
 * Retryable HTTP status codes from GitHub API.
 * 429 = rate limited, 500/502/503/504 = server errors
 */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff.
 *
 * @param {Function} fn          - Async function to retry
 * @param {Object}   options
 * @param {number}   options.maxRetries  - Max attempts (default 5)
 * @param {number}   options.baseDelay  - Base delay in ms (default 1000)
 * @param {Function} options.onRetry    - Optional callback(attempt, delayMs, error)
 */
const retry = async (fn, { maxRetries = 5, baseDelay = 1000, onRetry } = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      const isRetryable = !status || RETRYABLE_STATUSES.has(status);

      // Do not retry on non-retryable errors (e.g. 404, 422)
      if (!isRetryable) throw error;

      if (attempt === maxRetries) break;

      // Respect Retry-After header for 429 rate limiting
      let waitMs;
      if (status === 429 && error.response?.headers?.["retry-after"]) {
        waitMs = parseInt(error.response.headers["retry-after"], 10) * 1000;
      } else {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        waitMs = baseDelay * Math.pow(2, attempt - 1);
      }

      console.warn(
        `[Retry] Attempt ${attempt}/${maxRetries} failed (status: ${status ?? "network"}). Retrying in ${waitMs}ms...`
      );

      if (onRetry) onRetry(attempt, waitMs, error);

      await delay(waitMs);
    }
  }

  throw lastError;
};

module.exports = retry;
