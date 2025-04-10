/**
 * Cấu hình xác thực người dùng
 * 
 * File này chứa các cấu hình và hàm tiện ích liên quan đến 
 * xác thực người dùng, hash mật khẩu và phiên đăng nhập
 */

import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import { db } from "./database";
import { eq } from "drizzle-orm";
import { User, users } from "../models";

// Tạo phiên bản Promise của hàm scrypt
const scryptAsync = promisify(scrypt);

// Khởi tạo PostgreSQL session store
const PostgresSessionStore = connectPg(session);

/**
 * Hash mật khẩu sử dụng scrypt + salt
 * @param password - Mật khẩu cần hash
 * @returns Chuỗi đã hash theo định dạng [hash].[salt]
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * So sánh mật khẩu người dùng cung cấp với mật khẩu đã lưu
 * @param supplied - Mật khẩu người dùng nhập
 * @param stored - Mật khẩu đã hash trong DB
 * @returns true nếu mật khẩu khớp
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Tạo sessionStore sử dụng PostgreSQL
 */
export function createSessionStore(): session.Store {
  return new PostgresSessionStore({
    conObject: {
      connectionString: process.env.DATABASE_URL,
    },
    createTableIfMissing: true,
  });
}

/**
 * Thiết lập xác thực cho ứng dụng Express
 * Khởi tạo Passport.js với chiến lược xác thực local
 * @param app - Express application
 */
export function setupAuth(app: Express): void {
  // Cấu hình session
  const sessionStore = createSessionStore();
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'quiz_application_secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 86400000, // 24 giờ
      secure: process.env.NODE_ENV === 'production',
    }
  };

  // Cấu hình Express sử dụng session và passport
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Thiết lập chiến lược xác thực local
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Tìm người dùng theo username
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username));

        // Kiểm tra user tồn tại và mật khẩu hợp lệ
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Xác định cách lưu thông tin user vào session
  passport.serializeUser((user, done) => done(null, (user as User).id));
  
  // Xác định cách lấy thông tin user từ session
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Tìm user từ id trong session
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
        
      if (!user) {
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// Định nghĩa các middleware xác thực

/**
 * Middleware đảm bảo người dùng đã đăng nhập
 */
export function isAuthenticated(req: Request, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Yêu cầu đăng nhập" });
}

/**
 * Middleware đảm bảo người dùng là giáo viên
 */
export function isTeacher(req: Request, res: any, next: any) {
  if (req.isAuthenticated() && req.user && (req.user as User).role === 'teacher') {
    return next();
  }
  res.status(403).json({ message: "Yêu cầu quyền giáo viên" });
}

/**
 * Middleware đảm bảo người dùng là học sinh
 */
export function isStudent(req: Request, res: any, next: any) {
  if (req.isAuthenticated() && req.user && (req.user as User).role === 'student') {
    return next();
  }
  res.status(403).json({ message: "Yêu cầu quyền học sinh" });
}