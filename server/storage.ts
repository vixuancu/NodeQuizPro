import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or, ne, inArray } from "drizzle-orm";
import {
  users, exams, questions, submissions, answers,
  type User, type InsertUser,
  type Exam, type InsertExam,
  type Question, type InsertQuestion,
  type Submission, type InsertSubmission,
  type Answer, type InsertAnswer
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private examsMap: Map<number, Exam>;
  private questionsMap: Map<number, Question>;
  private submissionsMap: Map<number, Submission>;
  private answersMap: Map<number, Answer>;
  private currentId: {
    users: number;
    exams: number;
    questions: number;
    submissions: number;
    answers: number;
  };
  sessionStore: session.SessionStore;

  constructor() {
    this.usersMap = new Map();
    this.examsMap = new Map();
    this.questionsMap = new Map();
    this.submissionsMap = new Map();
    this.answersMap = new Map();
    this.currentId = {
      users: 1,
      exams: 1,
      questions: 1,
      submissions: 1,
      answers: 1
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const now = new Date();
    const user: User = { ...userData, id, createdAt: now };
    this.usersMap.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.usersMap.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }

  async getStudentsByClass(className: string): Promise<User[]> {
    return Array.from(this.usersMap.values()).filter(
      user => user.role === 'student' && user.class === className
    );
  }

  async getAllClasses(): Promise<string[]> {
    const classes = Array.from(this.usersMap.values())
      .filter(user => user.role === 'student' && user.class)
      .map(user => user.class as string);
    
    return [...new Set(classes)]; // Get unique class names
  }

  // Exam management
  async createExam(examData: InsertExam): Promise<Exam> {
    const id = this.currentId.exams++;
    const now = new Date();
    const exam: Exam = { ...examData, id, createdAt: now };
    this.examsMap.set(id, exam);
    return exam;
  }

  async getExam(id: number): Promise<Exam | undefined> {
    return this.examsMap.get(id);
  }

  async updateExam(id: number, data: Partial<Exam>): Promise<Exam | undefined> {
    const exam = this.examsMap.get(id);
    if (!exam) return undefined;
    
    const updatedExam = { ...exam, ...data };
    this.examsMap.set(id, updatedExam);
    return updatedExam;
  }

  async deleteExam(id: number): Promise<boolean> {
    return this.examsMap.delete(id);
  }

  async getExamsForTeacher(teacherId: number): Promise<Exam[]> {
    return Array.from(this.examsMap.values()).filter(
      exam => exam.createdById === teacherId
    );
  }

  async getExamsForClass(className: string): Promise<Exam[]> {
    return Array.from(this.examsMap.values()).filter(
      exam => exam.class === className
    );
  }

  async getUpcomingExamsForStudent(studentId: number): Promise<Exam[]> {
    const student = this.usersMap.get(studentId);
    if (!student || student.role !== 'student' || !student.class) {
      return [];
    }
    
    const now = new Date();
    return Array.from(this.examsMap.values()).filter(
      exam => exam.class === student.class && 
              exam.status === 'upcoming' &&
              new Date(exam.startTime) > now
    );
  }

  // Question management
  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const id = this.currentId.questions++;
    const now = new Date();
    const question: Question = { ...questionData, id, createdAt: now };
    this.questionsMap.set(id, question);
    return question;
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questionsMap.get(id);
  }

  async getQuestionsByExam(examId: number): Promise<Question[]> {
    return Array.from(this.questionsMap.values()).filter(
      question => question.examId === examId
    );
  }

  async updateQuestion(id: number, data: Partial<Question>): Promise<Question | undefined> {
    const question = this.questionsMap.get(id);
    if (!question) return undefined;
    
    const updatedQuestion = { ...question, ...data };
    this.questionsMap.set(id, updatedQuestion);
    return updatedQuestion;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    return this.questionsMap.delete(id);
  }

  // Submission management
  async createSubmission(submissionData: InsertSubmission): Promise<Submission> {
    const id = this.currentId.submissions++;
    const now = new Date();
    const submission: Submission = { ...submissionData, id, createdAt: now };
    this.submissionsMap.set(id, submission);
    return submission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    return this.submissionsMap.get(id);
  }

  async updateSubmission(id: number, data: Partial<Submission>): Promise<Submission | undefined> {
    const submission = this.submissionsMap.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission = { ...submission, ...data };
    this.submissionsMap.set(id, updatedSubmission);
    return updatedSubmission;
  }

  async getSubmissionsByExam(examId: number): Promise<Submission[]> {
    return Array.from(this.submissionsMap.values()).filter(
      submission => submission.examId === examId
    );
  }

  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return Array.from(this.submissionsMap.values()).filter(
      submission => submission.userId === studentId
    ).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Answer management
  async saveAnswer(answerData: InsertAnswer): Promise<Answer> {
    const id = this.currentId.answers++;
    const now = new Date();
    const answer: Answer = { ...answerData, id, createdAt: now };
    this.answersMap.set(id, answer);
    return answer;
  }

  async getAnswersBySubmission(submissionId: number): Promise<Answer[]> {
    return Array.from(this.answersMap.values()).filter(
      answer => answer.submissionId === submissionId
    );
  }
}

export const storage = new MemStorage();
