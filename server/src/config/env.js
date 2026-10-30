import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY,
  textModel: process.env.GEMINI_TEXT_MODEL,
  imageModel: process.env.GEMINI_IMAGE_MODEL,
  imagesEnabled: process.env.ENABLE_IMAGES === 'true',
  camEnabled: process.env.ENABLE_CAM === 'true',
};

export function validateEnv() {
  const required = { mongoUri: 'MONGODB_URI', geminiApiKey: 'GEMINI_API_KEY', textModel: 'GEMINI_TEXT_MODEL' };
  if (env.imagesEnabled || env.camEnabled) required.imageModel = 'GEMINI_IMAGE_MODEL';
  const missing = Object.entries(required).filter(([key]) => !env[key]?.trim()).map(([, name]) => name);
  if (missing.length) throw new Error(`Startup configuration is incomplete. Set these variables in server/.env: ${missing.join(', ')}`);
}
