import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "buildrex-ai-production-jwt-secret-2026";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    full_name?: string;
    company?: string;
    job_title?: string;
  };
}

export function registerUser(email: string, password: string, fullName?: string, company?: string, jobTitle?: string) {
  const existing = db.prepare("SELECT id FROM profiles WHERE email = ?").get(email);
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO profiles (id, email, password_hash, full_name, company, job_title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, email, passwordHash, fullName || "Buildrex Developer", company || "Independent", jobTitle || "Software Engineer", now, now);

  const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: "7d" });
  return {
    token,
    user: {
      id,
      email,
      full_name: fullName || "Buildrex Developer",
      company: company || "Independent",
      job_title: jobTitle || "Software Engineer"
    }
  };
}

export function loginUser(email: string, password: string) {
  const user = db.prepare("SELECT * FROM profiles WHERE email = ?").get(email) as any;
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      company: user.company,
      job_title: user.job_title
    }
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = db.prepare("SELECT id, email, full_name, avatar_url, company, job_title FROM profiles WHERE id = ?").get(decoded.id) as any;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User does not exist" });
    }
    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Unauthorized: Token expired or invalid" });
  }
}
