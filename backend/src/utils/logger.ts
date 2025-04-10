/**
 * Logger - Module ghi log cho ứng dụng
 * 
 * Cung cấp các hàm ghi log đồng nhất trên toàn ứng dụng
 * với khả năng phân biệt môi trường và mức độ nghiêm trọng
 */

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Cấu hình mức log dựa vào môi trường
const LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LogLevel.INFO 
  : LogLevel.DEBUG;

// Định dạng timestamp
const timestamp = () => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

/**
 * Ghi log debug - chỉ hiển thị trong môi trường phát triển
 * @param message Thông điệp log
 * @param data Dữ liệu bổ sung (tuỳ chọn)
 */
export function debug(message: string, data?: any): void {
  if (LOG_LEVEL >= LogLevel.DEBUG) {
    if (data) {
      console.log(`[${timestamp()}] 🔍 DEBUG: ${message}`, data);
    } else {
      console.log(`[${timestamp()}] 🔍 DEBUG: ${message}`);
    }
  }
}

/**
 * Ghi log thông tin chung
 * @param message Thông điệp log
 * @param data Dữ liệu bổ sung (tuỳ chọn)
 */
export function info(message: string, data?: any): void {
  if (LOG_LEVEL >= LogLevel.INFO) {
    if (data) {
      console.log(`[${timestamp()}] ℹ️ INFO: ${message}`, data);
    } else {
      console.log(`[${timestamp()}] ℹ️ INFO: ${message}`);
    }
  }
}

/**
 * Ghi log cảnh báo
 * @param message Thông điệp log
 * @param data Dữ liệu bổ sung (tuỳ chọn)
 */
export function warn(message: string, data?: any): void {
  if (LOG_LEVEL >= LogLevel.WARN) {
    if (data) {
      console.log(`[${timestamp()}] ⚠️ WARN: ${message}`, data);
    } else {
      console.log(`[${timestamp()}] ⚠️ WARN: ${message}`);
    }
  }
}

/**
 * Ghi log lỗi
 * @param message Thông điệp log
 * @param error Đối tượng lỗi (tuỳ chọn)
 */
export function error(message: string, error?: any): void {
  if (LOG_LEVEL >= LogLevel.ERROR) {
    if (error && error instanceof Error) {
      console.error(`[${timestamp()}] ❌ ERROR: ${message}`, {
        message: error.message,
        stack: error.stack,
      });
    } else if (error) {
      console.error(`[${timestamp()}] ❌ ERROR: ${message}`, error);
    } else {
      console.error(`[${timestamp()}] ❌ ERROR: ${message}`);
    }
  }
}

export default {
  debug,
  info,
  warn,
  error,
};