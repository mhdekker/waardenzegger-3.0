// Define log levels
const LOG_LEVELS = {
    NONE: 0,
    WARNING: 1,
    INFO: 2,
  };
  
  // Set current log level
  const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;
  
  /**
   * Log a message to the console.
   * @param {string} message - The message to log.
   */
  function logMessage(message) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.log(`INFO: ${message}`);
    }
  }
  
  /**
   * Log a warning to the console.
   * @param {string} warning - The warning to log.
   */
  function logWarning(warning) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARNING) {
      console.warn(`WARNING: ${warning}`);
    }
  }
  
  module.exports = {
    logMessage,
    logWarning,
  };