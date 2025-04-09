import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { ZodError } from "zod";
import { 
  insertExamSchema, 
  insertQuestionSchema, 
  insertSubmissionSchema, 
  insertAnswerSchema,
  registerStudentSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Error handler for Zod validation errors
  function handleZodError(error: unknown, res: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }

  // User management routes
  app.get("/api/users/students", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }

    // Optional class filter from query params
    const className = req.query.class as string | undefined;
    
    try {
      if (className) {
        const students = await storage.getStudentsByClass(className);
        return res.json(students.map(s => {
          const { password, ...studentWithoutPassword } = s;
          return studentWithoutPassword;
        }));
      } else {
        const classes = await storage.getAllClasses();
        
        // Get students for each class
        const result: Record<string, any> = {};
        for (const cls of classes) {
          const students = await storage.getStudentsByClass(cls);
          result[cls] = students.map(s => {
            const { password, ...studentWithoutPassword } = s;
            return studentWithoutPassword;
          });
        }
        
        return res.json(result);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users/students", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const studentData = registerStudentSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(studentData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create the student
      const student = await storage.createUser({
        ...studentData,
        role: 'student',
        password: studentData.password || studentData.studentId, // Default password is the student ID
      });
      
      // Don't send the password in the response
      const { password, ...studentWithoutPassword } = student;
      return res.status(201).json(studentWithoutPassword);
    } catch (error) {
      return handleZodError(error, res);
    }
  });

  // Exam management routes
  app.get("/api/exams", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      let exams;
      if (req.user?.role === 'teacher') {
        exams = await storage.getExamsForTeacher(req.user.id);
      } else {
        exams = await storage.getExamsForClass(req.user?.class || '');
      }
      
      return res.json(exams);
    } catch (error) {
      console.error("Error fetching exams:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/exams/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Students can only access exams for their class
      if (req.user?.role === 'student' && exam.class !== req.user.class) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      return res.json(exam);
    } catch (error) {
      console.error("Error fetching exam:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/exams", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const examData = insertExamSchema.parse({
        ...req.body,
        createdById: req.user.id,
      });
      
      const exam = await storage.createExam(examData);
      return res.status(201).json(exam);
    } catch (error) {
      return handleZodError(error, res);
    }
  });

  app.put("/api/exams/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Verify that this teacher created the exam
      if (exam.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedExam = await storage.updateExam(examId, req.body);
      return res.json(updatedExam);
    } catch (error) {
      console.error("Error updating exam:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/exams/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Verify that this teacher created the exam
      if (exam.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteExam(examId);
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting exam:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Question management routes
  app.get("/api/exams/:examId/questions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Teachers can access any questions
      // Students can only access questions for exams in their class
      if (req.user?.role === 'student' && exam.class !== req.user.class) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const questions = await storage.getQuestionsByExam(examId);
      return res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/exams/:examId/questions", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Verify that this teacher created the exam
      if (exam.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const questionData = insertQuestionSchema.parse({
        ...req.body,
        examId,
      });
      
      const question = await storage.createQuestion(questionData);
      return res.status(201).json(question);
    } catch (error) {
      return handleZodError(error, res);
    }
  });

  app.put("/api/questions/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Get the exam to verify ownership
      const exam = await storage.getExam(question.examId);
      
      if (!exam || exam.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedQuestion = await storage.updateQuestion(questionId, req.body);
      return res.json(updatedQuestion);
    } catch (error) {
      console.error("Error updating question:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/questions/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Get the exam to verify ownership
      const exam = await storage.getExam(question.examId);
      
      if (!exam || exam.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteQuestion(questionId);
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting question:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Submission routes
  app.post("/api/exams/:examId/submit", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'student') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Verify that this student is in the right class
      if (exam.class !== req.user.class) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get existing submission if any
      const existingSubmissions = await storage.getSubmissionsByExam(examId);
      const studentSubmission = existingSubmissions.find(s => s.userId === req.user!.id);
      
      // If there's already a completed submission, don't allow another one
      if (studentSubmission && studentSubmission.status === 'completed') {
        return res.status(400).json({ message: "Exam already submitted" });
      }
      
      // Get all questions for the exam
      const questions = await storage.getQuestionsByExam(examId);
      
      // Check if all questions have answers in the request
      const answers = req.body.answers;
      
      if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ message: "No answers provided" });
      }
      
      // If we have an in-progress submission, use that; otherwise create a new one
      let submission = studentSubmission;
      
      if (!submission) {
        // Create a new submission
        submission = await storage.createSubmission({
          examId,
          userId: req.user.id,
          startTime: new Date(),
          status: 'in_progress',
        });
      }
      
      // Calculate the score
      let score = 0;
      for (const answerData of answers) {
        const questionId = answerData.questionId;
        const question = questions.find(q => q.id === questionId);
        
        if (!question) {
          return res.status(400).json({ message: `Question with ID ${questionId} not found` });
        }
        
        const isCorrect = question.correctAnswer === answerData.answer;
        
        // Save the answer
        await storage.saveAnswer({
          submissionId: submission.id,
          questionId,
          answer: answerData.answer,
          isCorrect,
        });
        
        // Add points if correct
        if (isCorrect) {
          score += question.points;
        }
      }
      
      // Update the submission
      const updatedSubmission = await storage.updateSubmission(submission.id, {
        endTime: new Date(),
        score,
        status: 'completed',
      });
      
      return res.json(updatedSubmission);
    } catch (error) {
      console.error("Error submitting exam:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/submissions/student", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const submissions = await storage.getSubmissionsByStudent(req.user!.id);
      
      // For each submission, get the exam details
      const result = [];
      for (const submission of submissions) {
        const exam = await storage.getExam(submission.examId);
        result.push({
          ...submission,
          exam: exam || undefined,
        });
      }
      
      return res.json(result);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/exams/:examId/submissions", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Verify that this teacher created the exam
      if (exam.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const submissions = await storage.getSubmissionsByExam(examId);
      
      // For each submission, get the student details
      const result = [];
      for (const submission of submissions) {
        const student = await storage.getUser(submission.userId);
        if (student && student.role === 'student') {
          const { password, ...studentWithoutPassword } = student;
          result.push({
            ...submission,
            student: studentWithoutPassword,
          });
        }
      }
      
      return res.json(result);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/submissions/:id/answers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const submissionId = parseInt(req.params.id);
      const submission = await storage.getSubmission(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Students can only see their own submissions
      // Teachers can see all submissions
      if (req.user?.role === 'student' && submission.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (req.user?.role === 'teacher') {
        // Verify that this teacher created the exam
        const exam = await storage.getExam(submission.examId);
        if (!exam || exam.createdById !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const answers = await storage.getAnswersBySubmission(submissionId);
      
      // Include full question details for each answer
      const result = [];
      for (const answer of answers) {
        const question = await storage.getQuestion(answer.questionId);
        result.push({
          ...answer,
          question: question || undefined,
        });
      }
      
      return res.json(result);
    } catch (error) {
      console.error("Error fetching answers:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Class management routes
  app.get("/api/classes", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const classes = await storage.getAllClasses();
      return res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
