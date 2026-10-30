import { z } from 'zod';
import mongoose from 'mongoose';
import Case from '../models/Case.js';
import { DIFFICULTY } from '../config/difficulty.js';
import { generateJson } from './gemini.service.js';
import { buildMysteryPrompt } from '../prompts/mystery.js';
import { mysteryResponseSchema } from '../prompts/mysterySchema.js';
import { attachOptionalMedia } from './optionalMedia.js';

const generatedSchema = z.object({
  title: z.string().trim().min(1),
  setting: z.string().trim().min(1),
  story: z.string().trim().min(1),
  suspects: z.array(z.object({ name: z.string().trim().min(1), role: z.string().trim().min(1), description: z.string().trim().min(1), statedAlibi: z.string().trim().min(1), secretMotive: z.string().trim().min(1) })),
  culpritIndex: z.number().int(),
  motive: z.string().trim().min(1),
  method: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  clues: z.array(z.object({ title: z.string().trim().min(1), content: z.string().trim().min(1), type: z.enum(['chat', 'note', 'witness', 'object', 'log']), relatedSuspectIndexes: z.array(z.number().int()), pointsTo: z.enum(['culprit', 'innocent', 'neutral']), isRedHerring: z.boolean() })),
  hints: z.array(z.object({ text: z.string().trim().min(1) })),
  keyClueIndexes: z.array(z.number().int()),
});

function validateConsistency(mystery, difficulty) {
  const counts = DIFFICULTY[difficulty];
  const fail = (message) => { throw new Error(message); };
  if (mystery.suspects.length !== counts.suspects || mystery.clues.length !== counts.clues || mystery.hints.length !== counts.hints) fail(`Expected ${counts.suspects} suspects, ${counts.clues} clues, and ${counts.hints} hints for ${difficulty}.`);
  if (mystery.culpritIndex < 0 || mystery.culpritIndex >= mystery.suspects.length) fail('culpritIndex is outside the suspect list.');
  const names = mystery.suspects.map((suspect) => suspect.name.toLocaleLowerCase());
  if (new Set(names).size !== names.length) fail('Suspect names must be unique.');
  for (const clue of mystery.clues) {
    if (clue.relatedSuspectIndexes.some((index) => index < 0 || index >= mystery.suspects.length)) fail(`Clue "${clue.title}" references an unknown suspect.`);
  }
  const culpritIndex = mystery.culpritIndex;
  const culpritClues = mystery.clues.filter((clue) => clue.pointsTo === 'culprit' && clue.relatedSuspectIndexes.includes(culpritIndex));
  if (culpritClues.length < counts.culpritClues) fail(`At least ${counts.culpritClues} clues must point to the culprit.`);
  const redHerrings = mystery.clues.filter((clue) => clue.isRedHerring && clue.pointsTo === 'innocent' && clue.relatedSuspectIndexes.length > 0 && clue.relatedSuspectIndexes.every((index) => index !== culpritIndex));
  if (redHerrings.length < counts.redHerrings) fail(`At least ${counts.redHerrings} red herrings must point to innocent suspects.`);
  for (let index = 0; index < mystery.suspects.length; index += 1) {
    if (!mystery.clues.some((clue) => clue.relatedSuspectIndexes.includes(index))) fail(`Suspect ${index + 1} does not appear in any clue.`);
  }
  if (mystery.keyClueIndexes.length === 0 || mystery.keyClueIndexes.some((index) => index < 0 || index >= mystery.clues.length || !culpritClues.includes(mystery.clues[index]))) fail('Every keyClueIndex must reference a clue that points to the culprit.');
  if (difficulty === 'hard' && mystery.keyClueIndexes.length < 2) fail('Hard cases must require cross-referencing at least two key clues.');
  if (difficulty === 'easy' && !mystery.clues.some((clue) => /\b(contradict|could not have|impossible|inconsistent)\b/i.test(`${clue.title} ${clue.content}`))) fail('Easy cases must include an explicit contradiction in a clue.');
  const explanation = mystery.explanation.toLocaleLowerCase();
  for (const index of mystery.keyClueIndexes) {
    if (!explanation.includes(mystery.clues[index].title.toLocaleLowerCase())) fail(`The explanation must cite key clue "${mystery.clues[index].title}" by title.`);
  }
  const culpritName = mystery.suspects[culpritIndex].name.toLocaleLowerCase();
  for (const entry of [...mystery.clues.map((clue) => `${clue.title} ${clue.content}`), ...mystery.hints.map((hint) => hint.text)]) {
    if (entry.toLocaleLowerCase().includes(culpritName)) fail('A clue or hint states the culprit name outright.');
  }
}

function logValidationFailure(attempt, error, rawResponse) {
  const key = process.env.GEMINI_API_KEY;
  let message = JSON.stringify({ attempt, message: error.message, stack: error.stack, rawGeminiResponse: rawResponse });
  if (key) message = message.replaceAll(key, '[REDACTED]');
  console.error(`[generation:validation] ${message}`);
}

export async function generateMystery({ premise, difficulty }) {
  const counts = DIFFICULTY[difficulty];
  let validationError = '';
  let mystery;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let rawResponse;
    try {
      const generated = await generateJson(buildMysteryPrompt({ premise, difficulty, counts }, validationError), mysteryResponseSchema);
      rawResponse = JSON.stringify(generated);
      mystery = generatedSchema.parse(generated);
      validateConsistency(mystery, difficulty);
      break;
    } catch (error) {
      mystery = undefined;
      validationError = error.message;
      logValidationFailure(attempt, error, rawResponse || error.rawResponse);
    }
  }
  if (!mystery) {
    const error = new Error('The case file got lost. Try again.');
    error.status = 502;
    error.code = 'GENERATION_FAILED';
    throw error;
  }

  const suspects = mystery.suspects.map((suspect) => ({ _id: new mongoose.Types.ObjectId(), ...suspect }));
  const clues = mystery.clues.map((clue) => ({
    _id: new mongoose.Types.ObjectId(),
    title: clue.title,
    content: clue.content,
    type: clue.type,
    relatedSuspectIds: clue.relatedSuspectIndexes.map((index) => suspects[index]._id),
    pointsTo: clue.pointsTo,
    isRedHerring: clue.isRedHerring,
    discovered: false,
  }));
  const record = await Case.create({
    premise,
    difficulty,
    title: mystery.title,
    setting: mystery.setting,
    story: mystery.story,
    suspects,
    clues,
    hints: mystery.hints.map((hint) => ({ text: hint.text, used: false })),
    solution: {
      culpritSuspectId: suspects[mystery.culpritIndex]._id,
      motive: mystery.motive,
      method: mystery.method,
      explanation: mystery.explanation,
      keyClueIds: mystery.keyClueIndexes.map((index) => clues[index]._id),
    },
    progress: { cluesDiscovered: 0, hintsUsed: 0 },
    status: 'active',
  });
  await attachOptionalMedia(record);
  return record.toPublic();
}
