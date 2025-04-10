/**
 * Schema cơ sở dữ liệu sử dụng Drizzle ORM
 * 
 * File này định nghĩa cấu trúc của các bảng trong cơ sở dữ liệu và 
 * các kiểu dữ liệu TypeScript tương ứng
 */
import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Các enum định nghĩa các giá trị cố định cho các trường trong DB
export const roleEnum = pgEnum('role', ['teacher', 'student']);
export const examStatusEnum = pgEnum('exam_status', ['upcoming', 'active', 'completed', 'draft']);
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);
export const submissionStatusEnum = pgEnum('submission_status', ['in_progress', 'completed']);

/**
 * Bảng users - Lưu thông tin giáo viên và học sinh
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id", { length: 20 }).unique(), // Mã học sinh (chỉ áp dụng cho học sinh)
  fullName: varchar("full_name", { length: 100 }).notNull(), // Họ và tên đầy đủ
  username: text("username").notNull().unique(),              // Tên đăng nhập
  password: text("password").notNull(),                       // Mật khẩu (đã hash)
  email: varchar("email", { length: 100 }),                  // Email (tùy chọn)
  role: roleEnum("role").notNull().default('student'),        // Vai trò: giáo viên hoặc học sinh
  class: varchar("class", { length: 10 }),                   // Lớp (chỉ áp dụng cho học sinh)
  createdAt: timestamp("created_at").defaultNow(),           // Thời gian tạo tài khoản
});

/**
 * Bảng exams - Lưu thông tin bài kiểm tra
 */
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),         // Tiêu đề bài kiểm tra
  subject: varchar("subject", { length: 50 }).notNull(),      // Môn học: Toán, Lý, Hóa,...
  class: varchar("class", { length: 10 }).notNull(),         // Lớp áp dụng
  topic: varchar("topic", { length: 100 }),                  // Chủ đề (tùy chọn)
  startTime: timestamp("start_time").notNull(),              // Thời gian bắt đầu
  endTime: timestamp("end_time").notNull(),                  // Thời gian kết thúc
  duration: integer("duration").notNull(),                   // Thời gian làm bài (phút)
  status: examStatusEnum("status").notNull().default('upcoming'), // Trạng thái bài thi
  createdById: integer("created_by_id").notNull().references(() => users.id), // Người tạo (giáo viên)
  createdAt: timestamp("created_at").defaultNow(),           // Thời gian tạo bài kiểm tra
});

/**
 * Bảng questions - Lưu thông tin câu hỏi trong bài kiểm tra
 */
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id), // Thuộc bài kiểm tra nào
  content: text("content").notNull(),                        // Nội dung câu hỏi (hỗ trợ LaTeX)
  options: json("options").notNull(),                        // Các lựa chọn: {A: "...", B: "...", C: "...", D: "..."}
  correctAnswer: varchar("correct_answer", { length: 1 }).notNull(), // Đáp án đúng (A, B, C, D)
  points: integer("points").notNull().default(1),            // Điểm cho câu hỏi
  difficulty: difficultyEnum("difficulty").default('medium'), // Độ khó: dễ, trung bình, khó
  topic: varchar("topic", { length: 50 }),                   // Chủ đề câu hỏi (tùy chọn)
  createdAt: timestamp("created_at").defaultNow(),           // Thời gian tạo câu hỏi
});

/**
 * Bảng submissions - Lưu thông tin bài làm của học sinh
 */
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id), // Bài kiểm tra đang làm
  userId: integer("user_id").notNull().references(() => users.id), // Học sinh làm bài
  startTime: timestamp("start_time").notNull(),                    // Thời gian bắt đầu làm bài
  endTime: timestamp("end_time"),                                  // Thời gian nộp bài
  score: integer("score"),                                         // Điểm số đạt được
  status: submissionStatusEnum("status").notNull().default('in_progress'), // Trạng thái bài làm
  createdAt: timestamp("created_at").defaultNow(),                // Thời gian tạo bài làm
});

/**
 * Bảng answers - Lưu câu trả lời của học sinh cho từng câu hỏi
 */
export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissions.id), // Thuộc bài làm nào
  questionId: integer("question_id").notNull().references(() => questions.id),      // Câu hỏi nào
  answer: varchar("answer", { length: 1 }),                                        // Câu trả lời (A, B, C, D)
  isCorrect: boolean("is_correct"),                                                // Đúng hay sai
  createdAt: timestamp("created_at").defaultNow(),                                 // Thời gian trả lời
});

// ==================== PHẦN VALIDATION SCHEMA ====================
// Các schema này dùng để xác thực dữ liệu đầu vào trước khi lưu vào DB

/**
 * Schema tạo người dùng mới 
 */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

/**
 * Schema tạo bài kiểm tra mới
 */
export const insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true
});

/**
 * Schema tạo câu hỏi mới
 */
export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true
});

/**
 * Schema tạo bài làm mới
 */
export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true
});

/**
 * Schema tạo câu trả lời mới
 */
export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  createdAt: true
});

/**
 * Schema xác thực đăng nhập
 */
export const loginSchema = z.object({
  username: z.string().min(1, "Tên đăng nhập không được bỏ trống"),
  password: z.string().min(1, "Mật khẩu không được bỏ trống"),
});

/**
 * Schema đăng ký học sinh mới
 */
export const registerStudentSchema = insertUserSchema
  .omit({ role: true, email: true })
  .extend({
    studentId: z.string().min(1, "Mã học sinh không được bỏ trống"),
    fullName: z.string().min(1, "Họ tên không được bỏ trống"),
    class: z.string().min(1, "Lớp không được bỏ trống"),
  });

/**
 * Schema đăng ký giáo viên mới
 */
export const registerTeacherSchema = insertUserSchema
  .omit({ studentId: true, class: true, username: true })
  .extend({
    email: z.string().email("Email không hợp lệ"),
    fullName: z.string().min(1, "Họ tên không được bỏ trống"),
  });

// ==================== EXPORT CÁC KIỂU DỮ LIỆU ====================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Exam = typeof exams.$inferSelect;
export type InsertExam = z.infer<typeof insertExamSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterStudentData = z.infer<typeof registerStudentSchema>;
export type RegisterTeacherData = z.infer<typeof registerTeacherSchema>;