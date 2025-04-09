import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Use the database URL from environment variables
const sql = neon(process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/quiz_db');

// Initialize the database connection with our schema
export const db = drizzle(sql, { schema });
