/**
 * User Routes - Định nghĩa các route liên quan đến người dùng
 * 
 * File này định nghĩa các endpoint API liên quan đến việc đăng ký,
 * đăng nhập, quản lý người dùng, học sinh và giáo viên
 */

import { Router } from 'express';
import * as userController from '../controllers/userController';
import { isAuthenticated, isTeacher } from '../config/auth';
import passport from 'passport';

const router = Router();

// Route đăng ký và xác thực
router.post('/register/teacher', userController.registerTeacher);
router.post('/register/student', isTeacher, userController.registerStudent);

router.post('/login', 
  passport.authenticate('local', { failWithError: true }),
  userController.login
);

router.post('/logout', isAuthenticated, userController.logout);

// Route quản lý người dùng
router.get('/user', userController.getCurrentUser);
router.put('/users/:id', isAuthenticated, userController.updateUser);

// Route quản lý học sinh và lớp
router.get('/users/students', isAuthenticated, userController.getStudents);
router.get('/classes', isAuthenticated, userController.getClasses);

export default router;