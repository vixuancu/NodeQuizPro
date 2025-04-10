/**
 * Error Handler - Module xử lý lỗi
 * 
 * Cung cấp các lớp lỗi tùy chỉnh và middleware xử lý lỗi
 * giúp xử lý lỗi thống nhất trên toàn ứng dụng
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from './logger';

/**
 * Lỗi API - lỗi cơ bản mà API có thể trả về
 */
export class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Lỗi Không Tìm Thấy - Khi resource không tồn tại (404)
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Không tìm thấy tài nguyên yêu cầu') {
    super(404, message);
  }
}

/**
 * Lỗi Xác Thực - Khi thông tin đăng nhập không hợp lệ (401)
 */
export class AuthenticationError extends ApiError {
  constructor(message = 'Xác thực không thành công') {
    super(401, message);
  }
}

/**
 * Lỗi Phân Quyền - Khi không có quyền truy cập vào resource (403)
 */
export class AuthorizationError extends ApiError {
  constructor(message = 'Không đủ quyền truy cập') {
    super(403, message);
  }
}

/**
 * Lỗi Dữ Liệu - Khi dữ liệu không hợp lệ (400)
 */
export class ValidationError extends ApiError {
  details?: any;
  
  constructor(message = 'Dữ liệu không hợp lệ', details?: any) {
    super(400, message);
    this.details = details;
  }
}

/**
 * Lỗi Xung Đột - Khi xảy ra xung đột dữ liệu (409)
 */
export class ConflictError extends ApiError {
  constructor(message = 'Xung đột dữ liệu') {
    super(409, message);
  }
}

/**
 * Hàm xử lý lỗi từ ZodError
 * @param error Lỗi từ Zod validator
 * @returns Mảng các thông báo lỗi định dạng
 */
export function handleZodError(error: ZodError): string[] {
  return error.errors.map(err => {
    const field = err.path.join('.');
    return `${field ? field + ': ' : ''}${err.message}`;
  });
}

/**
 * Middleware xử lý lỗi chung
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Log lỗi
  logger.error(`${req.method} ${req.path}`, err);
  
  // Xử lý các loại lỗi khác nhau
  if (err instanceof ZodError) {
    // Lỗi validation từ Zod
    const messages = handleZodError(err);
    return res.status(400).json({ 
      error: 'Dữ liệu không hợp lệ',
      details: messages 
    });
  }
  
  if (err instanceof ApiError) {
    // Lỗi tự định nghĩa
    const response: any = { error: err.message };
    if (err instanceof ValidationError && err.details) {
      response.details = err.details;
    }
    
    return res.status(err.status).json(response);
  }
  
  // Các lỗi khác
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Đã xảy ra lỗi máy chủ'
    : err.message || 'Đã xảy ra lỗi máy chủ';
  
  res.status(statusCode).json({ error: message });
}