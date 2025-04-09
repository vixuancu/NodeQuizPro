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
  
  // Sample data endpoint
  app.post("/api/sample-data", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      // Create sample exams with questions
      const sampleExams = [
        {
          title: "Toán học cơ bản",
          subject: "mathematics",
          class: "10A",
          topic: "Đại số",
          description: "Kiểm tra kiến thức về đại số cơ bản",
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          endTime: new Date(Date.now() + 26 * 60 * 60 * 1000),   // Tomorrow + 2 hours
          duration: 60,
          status: "upcoming" as const,
          createdById: req.user.id
        },
        {
          title: "Vật lý học - Chuyển động học",
          subject: "physics",
          class: "11B",
          topic: "Cơ học",
          description: "Kiểm tra kiến thức về chuyển động của vật",
          startTime: new Date(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),  // Now + 2 hours
          duration: 45,
          status: "active" as const,
          createdById: req.user.id
        }
      ];
      
      // Create exams
      const examsCreated = [];
      for (const examData of sampleExams) {
        const exam = await storage.createExam(examData);
        examsCreated.push(exam);
        
        // Create sample questions for this exam
        if (exam.subject === "mathematics") {
          const mathQuestions = [
            {
              examId: exam.id,
              content: "Giải phương trình: $2x + 3 = 7$",
              options: ["x = 1", "x = 2", "x = 3", "x = 4"],
              correctAnswer: "B",  // The second option: "x = 2"
              difficulty: "easy" as const,
              points: 2,
              topic: "Đại số"
            },
            {
              examId: exam.id,
              content: "Nếu $f(x) = x^2 - 3x + 2$, tính $f(4)$",
              options: ["6", "10", "14", "18"],
              correctAnswer: "B",  // The second option: "10"
              difficulty: "medium" as const, 
              points: 3,
              topic: "Đại số"
            },
            {
              examId: exam.id,
              content: "Giải bất phương trình: $x^2 - 5x + 6 > 0$",
              options: ["$x < 2$ hoặc $x > 3$", "$x > 2$ hoặc $x < 3$", "$2 < x < 3$", "$x < 2$ và $x > 3$"],
              correctAnswer: "A",  // The first option: "$x < 2$ hoặc $x > 3$"
              difficulty: "hard" as const,
              points: 5,
              topic: "Đại số"
            }
          ];
          
          for (const questionData of mathQuestions) {
            await storage.createQuestion(questionData);
          }
        }
        
        if (exam.subject === "physics") {
          const physicsQuestions = [
            {
              examId: exam.id,
              content: "Công thức tính vận tốc trung bình là:",
              options: ["$v = \\frac{s}{t}$", "$v = a \\times t$", "$v = \\frac{1}{2}at^2$", "$v = v_0 + at$"],
              correctAnswer: "A",  // The first option: "$v = \\frac{s}{t}$"
              difficulty: "easy" as const,
              points: 2,
              topic: "Cơ học"
            },
            {
              examId: exam.id,
              content: "Đơn vị đo của gia tốc trong hệ SI là:",
              options: ["m/s", "m/s²", "km/h", "N/kg"],
              correctAnswer: "B",  // The second option: "m/s²"
              difficulty: "easy" as const, 
              points: 1,
              topic: "Cơ học"
            },
            {
              examId: exam.id,
              content: "Một vật chuyển động thẳng đều với vận tốc 5m/s. Quãng đường nó đi được sau 10 giây là:",
              options: ["25m", "50m", "100m", "10m"],
              correctAnswer: "B",  // The second option: "50m"
              difficulty: "medium" as const,
              points: 3,
              topic: "Cơ học"
            },
            {
              examId: exam.id,
              content: "Công thức tính động năng của vật là:",
              options: ["$E_k = mgh$", "$E_k = \\frac{1}{2}mv^2$", "$E_k = W/t$", "$E_k = F \\times s$"],
              correctAnswer: "B",  // The second option: "$E_k = \\frac{1}{2}mv^2$" 
              difficulty: "medium" as const,
              points: 3,
              topic: "Cơ học"
            }
          ];
          
          for (const questionData of physicsQuestions) {
            await storage.createQuestion(questionData);
          }
        }
      }
      
      return res.status(201).json({
        message: "Sample data created successfully",
        exams: examsCreated
      });
    } catch (error) {
      console.error("Error creating sample data:", error);
      return res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

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
