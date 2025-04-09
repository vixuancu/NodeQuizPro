import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or, ne, inArray, isNull, isNotNull } from "drizzle-orm";
import {
  users, exams, questions, submissions, answers,
  type User, type InsertUser,
  type Exam, type InsertExam,
  type Question, type InsertQuestion,
  type Submission, type InsertSubmission,
  type Answer, type InsertAnswer
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

// Storage interface definition
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getStudentsByClass(className: string): Promise<User[]>;
  getAllClasses(): Promise<string[]>;
  
  // Exam management
  createExam(exam: InsertExam): Promise<Exam>;
  getExam(id: number): Promise<Exam | undefined>;
  updateExam(id: number, data: Partial<Exam>): Promise<Exam | undefined>;
  deleteExam(id: number): Promise<boolean>;
  getExamsForTeacher(teacherId: number): Promise<Exam[]>;
  getExamsForClass(className: string): Promise<Exam[]>;
  getUpcomingExamsForStudent(studentId: number): Promise<Exam[]>;
  
  // Question management
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestion(id: number): Promise<Question | undefined>;
  getQuestionsByExam(examId: number): Promise<Question[]>;
  updateQuestion(id: number, data: Partial<Question>): Promise<Question | undefined>;
  deleteQuestion(id: number): Promise<boolean>;
  
  // Submission management
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  updateSubmission(id: number, data: Partial<Submission>): Promise<Submission | undefined>;
  getSubmissionsByExam(examId: number): Promise<Submission[]>;
  getSubmissionsByStudent(studentId: number): Promise<Submission[]>;
  
  // Answer management
  saveAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswersBySubmission(submissionId: number): Promise<Answer[]>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Initialize PostgreSQL-based session store
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getStudentsByClass(className: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, 'student'),
          eq(users.class, className)
        )
      );
  }

  async getAllClasses(): Promise<string[]> {
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

  // Exam management
  async createExam(examData: InsertExam): Promise<Exam> {
    const [exam] = await db.insert(exams).values(examData).returning();
    return exam;
  }

  async getExam(id: number): Promise<Exam | undefined> {
    const [exam] = await db.select().from(exams).where(eq(exams.id, id));
    return exam;
  }

  async updateExam(id: number, data: Partial<Exam>): Promise<Exam | undefined> {
    const [exam] = await db
      .update(exams)
      .set(data)
      .where(eq(exams.id, id))
      .returning();
    return exam;
  }

  async deleteExam(id: number): Promise<boolean> {
    const result = await db
      .delete(exams)
      .where(eq(exams.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getExamsForTeacher(teacherId: number): Promise<Exam[]> {
    return db
      .select()
      .from(exams)
      .where(eq(exams.createdById, teacherId));
  }

  async getExamsForClass(className: string): Promise<Exam[]> {
    return db
      .select()
      .from(exams)
      .where(eq(exams.class, className));
  }

  async getUpcomingExamsForStudent(studentId: number): Promise<Exam[]> {
    const student = await this.getUser(studentId);
    if (!student || student.role !== 'student' || !student.class) {
      return [];
    }
    
    const now = new Date();
    return db
      .select()
      .from(exams)
      .where(
        and(
          eq(exams.class, student.class),
          eq(exams.status, 'upcoming'),
          gte(exams.startTime, now)
        )
      );
  }

  // Question management
  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async getQuestionsByExam(examId: number): Promise<Question[]> {
    return db
      .select()
      .from(questions)
      .where(eq(questions.examId, examId));
  }

  async updateQuestion(id: number, data: Partial<Question>): Promise<Question | undefined> {
    const [question] = await db
      .update(questions)
      .set(data)
      .where(eq(questions.id, id))
      .returning();
    return question;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    const result = await db
      .delete(questions)
      .where(eq(questions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Submission management
  async createSubmission(submissionData: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(submissionData).returning();
    return submission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async updateSubmission(id: number, data: Partial<Submission>): Promise<Submission | undefined> {
    const [submission] = await db
      .update(submissions)
      .set(data)
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async getSubmissionsByExam(examId: number): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .where(eq(submissions.examId, examId));
  }

  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, studentId))
      .orderBy(desc(submissions.id));
  }

  // Answer management
  async saveAnswer(answerData: InsertAnswer): Promise<Answer> {
    const [answer] = await db.insert(answers).values(answerData).returning();
    return answer;
  }

  async getAnswersBySubmission(submissionId: number): Promise<Answer[]> {
    return db
      .select()
      .from(answers)
      .where(eq(answers.submissionId, submissionId));
  }
}

export const storage = new DatabaseStorage();
