// Console logging configuration
export const LOGGING_CONFIG = {
  // Environment-based settings
  PRODUCTION_MODE: process.env.NODE_ENV === 'production',
  DEVELOPMENT_MODE: process.env.NODE_ENV === 'development',
  
  // Log levels
  LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  },
  
  // Current log level (higher number = more verbose)
  CURRENT_LEVEL: process.env.NODE_ENV === 'production' ? 1 : 3,
  
  // Feature flags for specific logging
  FEATURES: {
    PERMISSION_CHECKS: process.env.NODE_ENV === 'development',
    LAZY_LOADING: false, // Disabled due to spam
    BACKGROUND_PRELOADER: false, // Only show significant progress
    CONTEXT_UPDATES: process.env.NODE_ENV === 'development',
  }
};

// Utility function for conditional logging
export const shouldLog = (level: number, feature?: keyof typeof LOGGING_CONFIG.FEATURES): boolean => {
  if (level > LOGGING_CONFIG.CURRENT_LEVEL) return false;
  if (feature && !LOGGING_CONFIG.FEATURES[feature]) return false;
  return true;
};

// Wrapper functions for cleaner logging
export const logError = (message: string, ...args: any[]) => {
  if (shouldLog(LOGGING_CONFIG.LEVELS.ERROR)) {
    console.error(message, ...args);
  }
};

export const logWarn = (message: string, ...args: any[]) => {
  if (shouldLog(LOGGING_CONFIG.LEVELS.WARN)) {
    console.warn(message, ...args);
  }
};

export const logInfo = (message: string, ...args: any[]) => {
  if (shouldLog(LOGGING_CONFIG.LEVELS.INFO)) {
    console.log(message, ...args);
  }
};

export const logDebug = (message: string, ...args: any[]) => {
  if (shouldLog(LOGGING_CONFIG.LEVELS.DEBUG)) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};
