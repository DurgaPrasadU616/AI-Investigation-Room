import express from 'express';
import cors from 'cors';
import caseRoutes from './routes/cases.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { env } from './config/env.js';

const app = express();
app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api/cases', caseRoutes);
app.use(notFound, errorHandler);
export default app;
