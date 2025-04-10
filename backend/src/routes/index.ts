/**
 * Routes Index - Tổng hợp tất cả các routes của ứng dụng
 * 
 * File này kết hợp tất cả các module routes riêng lẻ và tạo
 * một router tổng thể để sử dụng trong ứng dụng Express
 */

import { Router } from 'express';
import userRoutes from './userRoutes';
// Sau này sẽ import thêm các routes khác
// import examRoutes from './examRoutes';
// import questionRoutes from './questionRoutes';

const router = Router();

// Đăng ký các routes
router.use('/', userRoutes);
// router.use('/', examRoutes);
// router.use('/', questionRoutes);

export default router;