/**
 * Express App - Khởi tạo và cấu hình ứng dụng Express
 * 
 * File này chịu trách nhiệm thiết lập Express app, middleware,
 * cấu hình xác thực và routes
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { setupAuth } from './config/auth';
import { errorHandler } from './utils/error-handler';
import routes from './routes';
import logger from './utils/logger';
import path from 'path';

// Tạo ứng dụng Express
const app: Express = express();

// Thiết lập middleware cơ bản
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Thiết lập xác thực
setupAuth(app);

// Đăng ký API routes
app.use('/api', routes);

// Trong môi trường production, phục vụ các file tĩnh từ thư mục build của frontend
if (process.env.NODE_ENV === 'production') {
  // Đường dẫn đến thư mục build của frontend
  const frontendBuildPath = path.join(__dirname, '../../frontend/build');
  
  app.use(express.static(frontendBuildPath));
  
  // Tất cả các route không phải API sẽ trả về file index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} 
// Trong môi trường phát triển, cung cấp thông tin về API
else {
  app.get('/', (req, res) => {
    res.json({
      message: 'Quiz API - Hệ thống API quản lý thi trắc nghiệm',
      version: '1.0.0',
      docs: '/api/docs',
      time: new Date().toISOString()
    });
  });
  
  // API docs route (nếu cần)
  app.get('/api/docs', (req, res) => {
    res.json({
      message: 'API Documentation',
      routes: {
        auth: {
          register: 'POST /api/register/teacher',
          registerStudent: 'POST /api/register/student',
          login: 'POST /api/login',
          logout: 'POST /api/logout',
        },
        users: {
          current: 'GET /api/user',
          update: 'PUT /api/users/:id',
          students: 'GET /api/users/students',
          classes: 'GET /api/classes',
        },
        // Sẽ thêm các routes khác sau
      }
    });
  });
}

// Middleware xử lý lỗi
app.use(errorHandler);

// Middleware xử lý route không tồn tại
app.use((req, res, next) => {
  res.status(404).json({ error: 'Không tìm thấy đường dẫn yêu cầu' });
});

// Khởi động server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server đang chạy tại http://localhost:${PORT}`);
});

export default app;