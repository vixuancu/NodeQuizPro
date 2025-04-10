/**
 * Cấu hình kết nối cơ sở dữ liệu
 * File này chứa các cấu hình để kết nối đến PostgreSQL
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../models';
import logger from '../utils/logger';

// Cấu hình cho Neon Database (cho môi trường serverless)
// @ts-ignore - ws được cài đặt như một dependency
neonConfig.webSocketConstructor = require('ws');

// Kiểm tra biến môi trường
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL không được định nghĩa');
}

// Tạo connection pool
const sql = new Pool({ connectionString: process.env.DATABASE_URL });

// Khởi tạo Drizzle ORM với schema
export const db = drizzle(sql);

/**
 * Kiểm tra kết nối đến cơ sở dữ liệu
 * @returns {Promise<boolean>} - Trả về true nếu kết nối thành công
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await sql.query('SELECT 1');
    logger.info('Kết nối thành công đến cơ sở dữ liệu');
    return true;
  } catch (error) {
    logger.error('Không thể kết nối đến cơ sở dữ liệu', error);
    return false;
  }
}

/**
 * Đóng tất cả các kết nối trong pool
 */
export async function closeDatabase(): Promise<void> {
  try {
    await sql.end();
    logger.info('Đã đóng kết nối đến cơ sở dữ liệu');
  } catch (error) {
    logger.error('Lỗi khi đóng kết nối đến cơ sở dữ liệu', error);
  }
}