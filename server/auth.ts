import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'quiz_application_secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
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

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint for teachers
  app.post("/api/register/teacher", async (req, res, next) => {
    try {
      // Generate username from fullName
      const fullName = req.body.fullName;
      let username = fullName
        .toLowerCase()
        .replace(/\s+/g, '.') // replace spaces with dots
        .replace(/[^a-z0-9.]/g, ''); // remove special chars
      
      // Check if username exists
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        // Add a random number if username exists
        const randomSuffix = Math.floor(Math.random() * 1000);
        username = `${username}${randomSuffix}`;
      }

      const user = await storage.createUser({
        ...req.body,
        username,
        role: 'teacher',
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send the password in the response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // Registration endpoint for students (only admins can register students)
  app.post("/api/register/student", async (req, res, next) => {
    try {
      // Check if the current user is a teacher
      if (!req.user || req.user.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can register students" });
      }

      // Generate username from studentId and fullName
      const studentId = req.body.studentId;
      const fullName = req.body.fullName;
      let username = `${studentId.toLowerCase()}-${fullName
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '')}`;
      
      // If too long, truncate
      if (username.length > 50) {
        username = username.substring(0, 50);
      }

      // Check if username exists
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        // Add a random number if username exists
        const randomSuffix = Math.floor(Math.random() * 1000);
        username = `${username}${randomSuffix}`;
      }

      // Create the student with default password (can be changed later)
      const user = await storage.createUser({
        ...req.body,
        username,
        role: 'student',
        password: await hashPassword(req.body.password || req.body.studentId),
      });

      // Don't send the password in the response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: UserType | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Don't send the password in the response
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Don't send the password in the response
    const { password, ...userWithoutPassword } = req.user as UserType;
    res.json(userWithoutPassword);
  });
}
