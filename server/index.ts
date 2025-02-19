import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import crypto from "crypto";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { setupAuth } from "./auth";

// Generate a session secret if not provided
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
}

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration - must be before passport
const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    secure: app.get('env') === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' as const
  }
};

if (app.get("env") === "production") {
  app.set("trust proxy", 1);
  sessionConfig.cookie!.secure = true;
}

app.use(session(sessionConfig));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Setup authentication
setupAuth(app);

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

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

(async () => {
  try {
    // First verify database connection
    const { pool } = await import("./db");
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await pool.query('SELECT 1');
        log('Database connection successful');
        break;
      } catch (err) {
        retries++;
        console.error(`Database connection attempt ${retries} failed:`, err);
        if (retries === maxRetries) {
          console.error('Max retries reached, exiting...');
          process.exit(1);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const server = registerRoutes(app);

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use PORT from environment or fallback to 5000
    const startServer = async (startPort = 5000) => {
      const maxPort = startPort + 10; // Try up to 10 ports
      let PORT = startPort;

      while (PORT <= maxPort) {
        try {
          await new Promise((resolve, reject) => {
            server.listen(PORT, "0.0.0.0")
              .once('listening', () => {
                log(`Server running on port ${PORT}`);
                resolve(true);
              })
              .once('error', (err: Error & { code?: string }) => {
                if (err.code === 'EADDRINUSE') {
                  server.close();
                  PORT++;
                  resolve(false);
                } else {
                  reject(err);
                }
              });
          });
          break;
        } catch (err) {
          console.error('Failed to start server:', err);
          process.exit(1);
        }
      }
    };

    await startServer(parseInt(process.env.PORT || '5000'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();