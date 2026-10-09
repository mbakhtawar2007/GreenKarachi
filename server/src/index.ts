"use strict";

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import net from 'node:net';
import authRouter from './routes/auth';
import { config } from './config/env';

const app: Express = express();
const preferredPort = Number(process.env.PORT ?? process.env.SERVER_PORT ?? config.PORT);

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
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'GreenKarachi API is healthy'
  });
});

app.use('/api/auth', authRouter);

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'GreenKarachi API',
    version: '0.0.1',
    description: 'B2B plant marketplace backend',
    health: '/api/health',
    auth: '/api/auth'
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

startServer().catch((error) => {
  console.error('Failed to start GreenKarachi server:', error);
  process.exit(1);
});

export default app;