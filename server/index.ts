import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import crypto from "crypto";

// Generate a session secret if not provided
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // First verify database connection
    const { pool } = await import("./db");
    try {
      await pool.query('SELECT 1');
      log('Database connection successful');
    } catch (err) {
      console.error('Database connection failed:', err);
      process.exit(1);
    }

    const server = registerRoutes(app);

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use PORT from environment or fallback to 5000
    const PORT = process.env.PORT || 5000;

    // Kill any existing process on the port (development only)
    if (app.get("env") === "development") {
      try {
        const { execSync } = require('child_process');
        try {
          execSync(`lsof -ti :${PORT} | xargs kill -9`);
        } catch (killErr) {
          // Ignore if no process to kill
        }
        // Wait a moment for the port to be released
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error('Error cleaning up port:', err);
      }
    }

    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();