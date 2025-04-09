import { pgTable, text, serial, integer, boolean, timestamp, json, primaryKey, unique, foreignKey, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['teacher', 'student']);
export const examStatusEnum = pgEnum('exam_status', ['upcoming', 'active', 'completed', 'draft']);
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);
export const submissionStatusEnum = pgEnum('submission_status', ['in_progress', 'completed']);

// Users table (Teachers and Students)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id", { length: 20 }).unique(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 100 }),
  role: roleEnum("role").notNull().default('student'),
  class: varchar("class", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exams table
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 50 }).notNull(),
  class: varchar("class", { length: 10 }).notNull(),
  topic: varchar("topic", { length: 100 }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  status: examStatusEnum("status").notNull().default('upcoming'),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id),
  content: text("content").notNull(), // LaTeX formatted content
  options: json("options").notNull(), // {A: "...", B: "...", C: "...", D: "..."}
  correctAnswer: varchar("correct_answer", { length: 1 }).notNull(), // A, B, C, or D
  points: integer("points").notNull().default(1),
  difficulty: difficultyEnum("difficulty").default('medium'),
  topic: varchar("topic", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Submissions table (completed exams by students)
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id),
  userId: integer("user_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  score: integer("score"),
  status: submissionStatusEnum("status").notNull().default('in_progress'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Answers table (student responses to questions)
export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissions.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answer: varchar("answer", { length: 1 }), // A, B, C, or D
  isCorrect: boolean("is_correct"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  createdAt: true
});

// Extended schemas for validation
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerStudentSchema = insertUserSchema
  .omit({ role: true, email: true })
  .extend({
    studentId: z.string().min(1, "Student ID is required"),
    fullName: z.string().min(1, "Full name is required"),
    class: z.string().min(1, "Class is required"),
  });

export const registerTeacherSchema = insertUserSchema
  .omit({ studentId: true, class: true, username: true })
  .extend({
    email: z.string().email("Invalid email address"),
    fullName: z.string().min(1, "Full name is required"),
  });

// Types
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
