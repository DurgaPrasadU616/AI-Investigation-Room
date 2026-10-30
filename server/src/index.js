import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import { validateEnv, env } from './config/env.js';

async function start() {
  try {
    validateEnv();
    await connectDatabase();
    app.listen(env.port, () => console.info(`AI Mystery Room API listening on ${env.port}`));
  } catch (error) {
    console.error(`[startup] ${error.message}\n${error.stack || ''}`);
    process.exitCode = 1;
  }
}

await start();
