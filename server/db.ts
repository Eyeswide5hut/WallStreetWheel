import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Enable WebSocket support for Neon serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool with retry logic
const createPool = () => {
  return new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10, // Reduce max connections to prevent overload
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // Give more time for initial connection
    maxRetries: 3, // Add retry attempts
    keepAlive: true // Enable keep-alive
  });
};

export const pool = createPool();

// Initialize drizzle with the pool and error handling
export const db = drizzle(pool, { schema });

// Add error event handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Let the application continue, the pool will create a new connection when needed
});