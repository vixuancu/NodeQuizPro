/**
 * User Service - Xử lý logic nghiệp vụ liên quan đến người dùng
 * 
 * Module này chứa các hàm xử lý logic cho người dùng, học sinh và giáo viên
 * bao gồm tạo, tìm kiếm, cập nhật thông tin, và xử lý các nghiệp vụ liên quan
 */

import { db } from '../config/database';
import { eq, and, like, isNotNull } from 'drizzle-orm';
import { 
  User, InsertUser, users, 
  RegisterStudentData, RegisterTeacherData 
} from '../models';
import { hashPassword } from '../config/auth';
import logger from '../utils/logger';
import { 
  ConflictError, 
  NotFoundError,
  ValidationError
} from '../utils/error-handler';

/**
 * Tìm người dùng theo ID
 * @param id ID người dùng
 * @returns Thông tin người dùng hoặc undefined nếu không tìm thấy
 */
export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

/**
 * Tìm người dùng theo tên đăng nhập
 * @param username Tên đăng nhập
 * @returns Thông tin người dùng hoặc undefined nếu không tìm thấy
 */
export async function getUserByUsername(username: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user;
}

/**
 * Tạo username tự động từ tên đầy đủ
 * @param fullName Tên đầy đủ của người dùng
 * @returns Username được tạo tự động
 */
export async function generateUsername(fullName: string): Promise<string> {
  // Tạo username ban đầu từ fullName
  let username = fullName
    .toLowerCase()
    .normalize('NFD') // Chuẩn hóa các dấu tiếng Việt
    .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu thanh
    .replace(/\s+/g, '.') // Thay thế khoảng trắng bằng dấu chấm
    .replace(/[^a-z0-9.]/g, ''); // Loại bỏ ký tự đặc biệt
  
  // Kiểm tra xem username đã tồn tại chưa
  const existingUser = await getUserByUsername(username);
  
  // Nếu username đã tồn tại, thêm số ngẫu nhiên vào cuối
  if (existingUser) {
    const randomSuffix = Math.floor(Math.random() * 1000);
    username = `${username}${randomSuffix}`;
  }
  
  return username;
}

/**
 * Đăng ký tài khoản giáo viên mới
 * @param data Thông tin đăng ký giáo viên
 * @returns Thông tin giáo viên đã tạo
 */
export async function registerTeacher(data: RegisterTeacherData): Promise<User> {
  // Kiểm tra email đã tồn tại chưa
  if (data.email) {
    const [existingUserWithEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email));
    
    if (existingUserWithEmail) {
      throw new ConflictError('Email đã được sử dụng');
    }
  }
  
  // Tạo username từ tên người dùng
  const username = await generateUsername(data.fullName);
  
  // Hash mật khẩu
  const hashedPassword = await hashPassword(data.password);
  
  // Tạo người dùng mới
  const [user] = await db.insert(users).values({
    ...data,
    username,
    password: hashedPassword,
    role: 'teacher',
  }).returning();
  
  logger.info(`Đã tạo giáo viên mới: ${username}`);
  
  // Loại bỏ mật khẩu trước khi trả về
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword as User;
}

/**
 * Đăng ký tài khoản học sinh mới
 * @param data Thông tin đăng ký học sinh
 * @returns Thông tin học sinh đã tạo
 */
export async function registerStudent(data: RegisterStudentData): Promise<User> {
  // Kiểm tra studentId đã tồn tại chưa
  const [existingStudent] = await db
    .select()
    .from(users)
    .where(eq(users.studentId, data.studentId));
  
  if (existingStudent) {
    throw new ConflictError('Mã học sinh đã tồn tại');
  }
  
  // Tạo username từ mã học sinh và tên
  let username = `${data.studentId.toLowerCase()}-${data.fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')}`;
  
  // Nếu username quá dài, cắt bớt
  if (username.length > 50) {
    username = username.substring(0, 50);
  }
  
  // Kiểm tra username đã tồn tại chưa
  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    const randomSuffix = Math.floor(Math.random() * 1000);
    username = `${username}${randomSuffix}`;
  }
  
  // Hash mật khẩu (dùng mã học sinh làm mật khẩu mặc định nếu không có)
  const password = data.password || data.studentId;
  const hashedPassword = await hashPassword(password);
  
  // Tạo học sinh mới
  const [user] = await db.insert(users).values({
    ...data,
    username,
    password: hashedPassword,
    role: 'student',
  }).returning();
  
  logger.info(`Đã tạo học sinh mới: ${username}, lớp: ${data.class}`);
  
  // Loại bỏ mật khẩu trước khi trả về
  const { password: _password, ...userWithoutPassword } = user;
  return userWithoutPassword as User;
}

/**
 * Lấy danh sách học sinh theo lớp
 * @param className Tên lớp
 * @returns Danh sách học sinh
 */
export async function getStudentsByClass(className: string): Promise<User[]> {
  const students = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, 'student'),
        eq(users.class, className)
      )
    );
  
  // Loại bỏ mật khẩu khỏi dữ liệu trả về
  return students.map(student => {
    const { password, ...studentWithoutPassword } = student;
    return studentWithoutPassword as User;
  });
}

/**
 * Lấy danh sách tất cả các lớp
 * @returns Danh sách tên lớp
 */
export async function getAllClasses(): Promise<string[]> {
  const result = await db
    .select({ class: users.class })
    .from(users)
    .where(
      and(
        eq(users.role, 'student'),
        isNotNull(users.class)
      )
    )
    .groupBy(users.class);
  
  return result.map(row => row.class as string);
}

/**
 * Cập nhật thông tin người dùng
 * @param id ID người dùng
 * @param data Dữ liệu cần cập nhật
 * @returns Thông tin người dùng sau khi cập nhật
 */
export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  // Kiểm tra người dùng tồn tại
  const existingUser = await getUserById(id);
  if (!existingUser) {
    throw new NotFoundError('Không tìm thấy người dùng');
  }
  
  // Nếu cập nhật email, kiểm tra email đã tồn tại chưa
  if (data.email && data.email !== existingUser.email) {
    const [userWithEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email));
    
    if (userWithEmail) {
      throw new ConflictError('Email đã được sử dụng');
    }
  }
  
  // Nếu cập nhật mật khẩu, hash mật khẩu mới
  if (data.password) {
    data.password = await hashPassword(data.password);
  }
  
  // Cập nhật thông tin người dùng
  const [updatedUser] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  
  if (!updatedUser) {
    throw new Error('Cập nhật người dùng thất bại');
  }
  
  logger.info(`Đã cập nhật thông tin người dùng: ${updatedUser.username}`);
  
  // Loại bỏ mật khẩu trước khi trả về
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword as User;
}