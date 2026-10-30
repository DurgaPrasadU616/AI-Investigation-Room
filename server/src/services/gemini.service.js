/* global AbortController */
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

let client;

function getClient() {
  client ||= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

function redact(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return env.geminiApiKey ? text.replaceAll(env.geminiApiKey, '[REDACTED]') : text;
}

function logGeminiFailure(step, error, rawResponse) {
  console.error(`[gemini:${step}] ${redact({ message: error.message, stack: error.stack, rawResponse })}`);
}

function stripJsonFence(text) {
  const value = String(text || '').trim();
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : value;
}

function withTimeout(startRequest, milliseconds = 60_000) {
  let timer;
  const controller = new AbortController();
  return Promise.race([
    startRequest(controller.signal),
    new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Gemini request timed out after 60 seconds.')); }, milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

export async function generateJson(prompt, responseSchema) {
  let rawResponse;
  try {
    const response = await withTimeout((abortSignal) => getClient().models.generateContent({
      model: env.textModel,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema, abortSignal },
    }));
    rawResponse = response.text;
    return JSON.parse(stripJsonFence(rawResponse));
  } catch (error) {
    logGeminiFailure('generate-content', error, rawResponse);
    error.rawResponse = rawResponse;
    throw error;
  }
}

export async function generateImage(prompt) {
  let rawResponse;
  try {
    const response = await withTimeout((abortSignal) => getClient().models.generateContent({
      model: env.imageModel,
      contents: prompt,
      config: { responseModalities: ['IMAGE'], abortSignal },
    }));
    rawResponse = response;
    const imagePart = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
    if (!imagePart) throw new Error('Gemini image response did not contain image data.');
    return { data: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType || 'image/png' };
  } catch (error) {
    logGeminiFailure('generate-image', error, rawResponse);
    throw error;
  }
}
