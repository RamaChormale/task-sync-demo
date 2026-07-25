const delay = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const retry = async (fn, retries = 3, delayMs = 2000) => {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt}`);

      return await fn();
    } catch (error) {
      lastError = error;

      console.log(`Attempt ${attempt} failed`);

      if (attempt < retries) {
        console.log(`Retrying in ${delayMs / 1000} seconds...`);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
};

module.exports = retry;