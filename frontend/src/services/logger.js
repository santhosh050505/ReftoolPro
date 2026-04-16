// Logger service - disables console output in production
const logger = {
  log: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(...args);
    }
  },
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(...args);
    }
  }
};

export default logger;
