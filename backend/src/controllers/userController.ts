/**
 * User Controller - Xử lý các request liên quan đến người dùng
 * 
 * Controller này cung cấp các hàm xử lý request liên quan đến
 * đăng ký, đăng nhập, quản lý người dùng, học sinh và giáo viên
 */

import { Request, Response, NextFunction } from 'express';
import { loginSchema, registerStudentSchema, registerTeacherSchema, User } from '../models';
import * as userService from '../services/userService';
import { AuthenticationError, ValidationError } from '../utils/error-handler';
import logger from '../utils/logger';

// Khai báo bổ sung interface cho Express Request
declare global {
  namespace Express {
    // Extend the User interface
    interface User {
      id: number;
      username: string;
      password: string;
      fullName: string;
      email?: string;
      role: 'teacher' | 'student';
      class?: string;
      studentId?: string;
    }
  }
}

/**
 * Đăng ký tài khoản giáo viên mới
 * @route POST /api/register/teacher
 */
export async function registerTeacher(req: Request, res: Response, next: NextFunction) {
  try {
    // Xác thực dữ liệu đầu vào
    const validatedData = registerTeacherSchema.parse(req.body);
    
    // Tạo tài khoản giáo viên mới
    const teacher = await userService.registerTeacher(validatedData);
    
    // Tự động đăng nhập nếu là đăng ký trực tiếp
    if (!req.user) {
      req.login(teacher, (err) => {
        if (err) return next(err);
        res.status(201).json(teacher);
      });
    } else {
      res.status(201).json(teacher);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Đăng ký tài khoản học sinh mới (chỉ giáo viên mới có thể đăng ký)
 * @route POST /api/register/student
 */
export async function registerStudent(req: Request, res: Response, next: NextFunction) {
  try {
    // Kiểm tra quyền (chỉ giáo viên mới có thể đăng ký học sinh)
    if (!req.user || req.user.role !== 'teacher') {
      throw new AuthenticationError('Chỉ giáo viên mới có thể đăng ký học sinh');
    }
    
    // Xác thực dữ liệu đầu vào
    const validatedData = registerStudentSchema.parse(req.body);
    
    // Tạo tài khoản học sinh mới
    const student = await userService.registerStudent(validatedData);
    
    res.status(201).json(student);
  } catch (error) {
    next(error);
  }
}

/**
 * Đăng nhập
 * @route POST /api/login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  // Xử lý đăng nhập được thực hiện bởi Passport trong routes
  try {
    // Xác thực dữ liệu đầu vào
    loginSchema.parse(req.body);
    
    // Nếu đến đây, nghĩa là authentication đã thành công và user đã được gán vào req
    if (!req.user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    
    // Loại bỏ mật khẩu khỏi dữ liệu trả về
    const { password, ...userWithoutPassword } = req.user;
    
    logger.info(`Người dùng đăng nhập thành công: ${req.user.username}`);
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
}

/**
 * Đăng xuất
 * @route POST /api/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    // Lấy thông tin người dùng trước khi đăng xuất để ghi log
    const username = req.user?.username;
    
    req.logout((err) => {
      if (err) return next(err);
      
      logger.info(`Người dùng đăng xuất: ${username}`);
      res.status(200).json({ message: 'Đăng xuất thành công' });
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy thông tin người dùng hiện tại
 * @route GET /api/user
 */
export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }
    
    // Loại bỏ mật khẩu khỏi dữ liệu trả về
    const { password, ...userWithoutPassword } = req.user;
    
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách học sinh theo lớp
 * @route GET /api/users/students
 */
export async function getStudents(req: Request, res: Response, next: NextFunction) {
  try {
    // Lấy lớp từ query parameter
    const className = req.query.class as string;
    
    if (!className) {
      // Nếu không có lớp, trả về danh sách tất cả các lớp
      const classes = await userService.getAllClasses();
      
      // Tạo đối tượng với key là tên lớp, value là danh sách học sinh
      const studentsByClass: Record<string, any> = {};
      
      for (const cls of classes) {
        studentsByClass[cls] = await userService.getStudentsByClass(cls);
      }
      
      return res.status(200).json(studentsByClass);
    }
    
    // Lấy danh sách học sinh theo lớp
    const students = await userService.getStudentsByClass(className);
    res.status(200).json(students);
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách lớp
 * @route GET /api/classes
 */
export async function getClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const classes = await userService.getAllClasses();
    res.status(200).json(classes);
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật thông tin người dùng
 * @route PUT /api/users/:id
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Đảm bảo người dùng đã đăng nhập
    if (!req.isAuthenticated() || !req.user) {
      throw new AuthenticationError('Yêu cầu đăng nhập');
    }
    
    // Kiểm tra quyền: chỉ cập nhật được chính mình hoặc là giáo viên
    if (req.user.id !== userId && req.user.role !== 'teacher') {
      throw new AuthenticationError('Không có quyền cập nhật thông tin người dùng khác');
    }
    
    // Chỉ giáo viên mới có thể thay đổi role
    if (req.body.role && req.user.role !== 'teacher') {
      throw new ValidationError('Không có quyền thay đổi vai trò người dùng');
    }
    
    const updatedUser = await userService.updateUser(userId, req.body);
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
}