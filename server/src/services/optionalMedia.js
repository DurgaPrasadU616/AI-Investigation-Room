import sharp from 'sharp';
import { env } from '../config/env.js';
import { generateImage } from './gemini.service.js';

async function createWebpDataUri(prompt) {
  const image = await generateImage(prompt);
  const webp = await sharp(Buffer.from(image.data, 'base64')).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 48 }).toBuffer();
  return `data:image/webp;base64,${webp.toString('base64')}`;
}

function logOptionalFailure(step, error) {
  console.error(`[optional-media:${step}] ${JSON.stringify({ message: error.message, stack: error.stack })}`);
}

export async function attachOptionalMedia(record) {
  if (!env.imagesEnabled && !env.camEnabled) return;
  for (const [index, clue] of record.clues.entries()) {
    if (env.imagesEnabled) {
      try {
        clue.image = await createWebpDataUri(`Create a realistic, non-graphic fictional evidence photograph for a mystery game. Depict only the physical clue, no readable text and no identifiable people. Premise: ${record.premise}. Clue: ${clue.title}. Evidence details: ${clue.content}.`);
      } catch (error) { logOptionalFailure(`clue-image-${index + 1}`, error); }
    }
  }
  if (env.camEnabled) {
    const target = record.clues.find((clue) => ['object', 'log'].includes(clue.type)) || record.clues[0];
    if (target) {
      const frames = [];
      for (let frame = 1; frame <= 3; frame += 1) {
        try {
          frames.push(await createWebpDataUri(`Create CCTV frame ${frame} of 3 from a fixed high corner security camera in a fictional, non-graphic mystery. Grainy monochrome, timestamp overlay omitted, no readable text. Keep camera angle and room layout consistent. Premise: ${record.premise}. Evidence location: ${target.title}, ${target.content}. Frame ${frame} shows a subtle later moment in the same scene.`));
        } catch (error) { logOptionalFailure(`cam-frame-${frame}`, error); }
      }
      if (frames.length) target.footage = frames;
    }
  }
  if (record.isModified()) await record.save();
}
