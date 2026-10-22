"use strict";

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import net from 'node:net';
import { config } from './config/env';
import authRoutes from './routes/auth';
import catalogRoutes from './routes/catalog';
import quoteRoutes from './routes/quotes';
import collaborationRoutes from './routes/collaboration';
import projectRoutes from './routes/projects';
import adminRoutes from './routes/admin';
import reportRoutes from './routes/reports';
import conversationRoutes from './routes/conversations';
import notificationRoutes from './routes/notifications';

const app: Express = express();
const preferredPort = Number(process.env.PORT ?? process.env.SERVER_PORT ?? config.PORT);
const allowedOrigins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim());
const isLocalDevelopmentOrigin = (origin: string) => {
  if (config.NODE_ENV !== 'development') return false;
  try {
    const parsed = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(parsed.hostname) && ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const getAvailablePort = (candidatePort: number): Promise<number> =>
  new Promise((resolve, reject) => {
    const tester = net.createServer();

    tester.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(getAvailablePort(candidatePort + 1));
        return;
      }

      reject(error);
    });

    tester.once('listening', () => {
      const address = tester.address();
      const port = typeof address === 'object' && address ? address.port : candidatePort;

      tester.close(() => resolve(port));
    });

    tester.listen(candidatePort, '0.0.0.0');
  });

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)),
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/catalog/listings', catalogRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'GreenKarachi API is healthy'
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'GreenKarachi API',
    version: '0.0.1',
    description: 'B2B plant marketplace backend',
    health: '/api/health',
    auth: 'disabled-for-now'
  });
});

app.use((error: Error, req: Request, res: Response, _next: () => void) => {
  console.error('Unhandled API error:', error);
  res.status(500).json({ message: 'Internal server error.' });
});

const startServer = async () => {
  const PORT = await getAvailablePort(preferredPort);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

// Only listen when this file is the process entry point (`npm start`,
// `npm run dev`) and we are not running on Vercel. When the app is
// imported instead — by the Vercel serverless entry in `api/index.js` —
// the exported app handles requests without ever binding a port.
const isDirectRun = require.main === module;

if (isDirectRun && !process.env.VERCEL) {
  startServer().catch((error) => {
    console.error('Failed to start GreenKarachi server:', error);
    process.exit(1);
  });
}

export default app;