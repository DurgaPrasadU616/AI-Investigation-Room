import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Case from '../models/Case.js';
import { DIFFICULTY } from '../config/difficulty.js';
import { generateMystery } from '../services/mysteryGenerator.js';
import { premiseRejection } from '../services/premiseValidator.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createCaseLimiter } from '../middleware/rateLimit.js';

const router = Router();
const createCaseSchema = z.object({ premise: z.string().trim().min(20).max(500), difficulty: z.enum(['easy', 'medium', 'hard']) });
const isId = (value) => mongoose.isValidObjectId(value);
const fail = (res, status, code, message) => res.status(status).json({ success: false, error: { code, message } });

router.post('/', createCaseLimiter, asyncHandler(async (req, res) => {
  const parsed = createCaseSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Check the premise and difficulty.');
  const rejection = premiseRejection(parsed.data.premise);
  if (rejection) return fail(res, 422, 'VALIDATION_ERROR', rejection);
  if (!DIFFICULTY[parsed.data.difficulty]) return fail(res, 422, 'VALIDATION_ERROR', 'Choose Easy, Medium, or Hard.');
  const record = await generateMystery(parsed.data);
  return res.status(201).json({ success: true, data: record });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 422, 'VALIDATION_ERROR', 'The case id is invalid.');
  const record = await Case.findById(req.params.id).select('+hints.text +clues.image +clues.footage');
  if (!record) return fail(res, 404, 'NOT_FOUND', 'Case not found.');
  return res.json({ success: true, data: record.toPublic({ revealCompleted: false }) });
}));

router.post('/:id/clues/:clueId/discover', asyncHandler(async (req, res) => {
  const { id, clueId } = req.params;
  if (!isId(id) || !isId(clueId)) return fail(res, 422, 'VALIDATION_ERROR', 'The case or clue id is invalid.');
  const record = await Case.findById(id);
  if (!record) return fail(res, 404, 'NOT_FOUND', 'Case not found.');
  if (record.status !== 'active') return fail(res, 409, 'ALREADY_ACCUSED', 'This case has already been accused.');
  const clueExists = record.clues.id(clueId);
  if (!clueExists) return fail(res, 404, 'NOT_FOUND', 'Clue not found.');
  await Case.updateOne(
    { _id: id, status: 'active', clues: { $elemMatch: { _id: clueId, discovered: false } } },
    { $set: { 'clues.$.discovered': true, 'clues.$.discoveredAt': new Date() }, $inc: { 'progress.cluesDiscovered': 1 } },
  );
  const latest = await Case.findById(id);
  if (latest.status !== 'active') return fail(res, 409, 'ALREADY_ACCUSED', 'This case has already been accused.');
  const clue = latest.clues.id(clueId);
  return res.json({ success: true, data: { clue: { _id: clue._id, title: clue.title, content: clue.content, type: clue.type }, progress: record.progress } });
}));

router.post('/:id/hints', asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 422, 'VALIDATION_ERROR', 'The case id is invalid.');
  const record = await Case.findById(req.params.id).select('+hints.text');
  if (!record) return fail(res, 404, 'NOT_FOUND', 'Case not found.');
  if (record.status !== 'active') return fail(res, 409, 'ALREADY_ACCUSED', 'This case has already been accused.');
  const hinted = await Case.findOneAndUpdate(
    { _id: req.params.id, status: 'active', hints: { $elemMatch: { used: false } } },
    { $set: { 'hints.$.used': true }, $inc: { 'progress.hintsUsed': 1 } },
    { new: true },
  ).select('+hints.text');
  if (!hinted) {
    const latest = await Case.findById(req.params.id);
    return latest?.status === 'completed'
      ? fail(res, 409, 'ALREADY_ACCUSED', 'This case has already been accused.')
      : fail(res, 409, 'NO_HINTS_LEFT', 'No hints remain for this case.');
  }
  const hint = hinted.hints[hinted.progress.hintsUsed - 1];
  return res.json({ success: true, data: { hint: { _id: hint._id, text: hint.text }, progress: hinted.progress, hintsRemaining: hinted.hints.filter((item) => !item.used).length } });
}));

router.post('/:id/accuse', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parsed = z.object({ suspectId: z.string().refine(isId) }).safeParse(req.body);
  if (!isId(id) || !parsed.success) return fail(res, 422, 'VALIDATION_ERROR', 'Provide valid case and suspect ids.');
  const record = await Case.findById(id).select('+solution +suspects.secretMotive +clues.pointsTo +clues.isRedHerring +hints.text');
  if (!record) return fail(res, 404, 'NOT_FOUND', 'Case not found.');
  if (record.status === 'completed') return fail(res, 409, 'ALREADY_ACCUSED', 'Only one accusation is allowed per case.');
  const suspect = record.suspects.id(parsed.data.suspectId);
  if (!suspect) return fail(res, 422, 'VALIDATION_ERROR', 'That suspect does not belong to this case.');
  const correct = suspect._id.equals(record.solution.culpritSuspectId);
  const base = correct ? ({ easy: 100, medium: 150, hard: 200 })[record.difficulty] : 0;
  const cluePoints = record.progress.cluesDiscovered * 5;
  const hintPenalty = record.progress.hintsUsed * 10;
  const score = { base, cluePoints, hintPenalty, total: Math.max(0, base + cluePoints - hintPenalty) };
  const completed = await Case.findOneAndUpdate(
    { _id: id, status: 'active' },
    { $set: { status: 'completed', accusation: { suspectId: suspect._id, correct, at: new Date() }, score } },
    { new: true, runValidators: true },
  ).select('+solution +suspects.secretMotive +clues.pointsTo +clues.isRedHerring +hints.text +clues.image +clues.footage');
  if (!completed) return fail(res, 409, 'ALREADY_ACCUSED', 'Only one accusation is allowed per case.');
  return res.json({ success: true, data: completed.toPublic({ revealCompleted: true }) });
}));

router.get('/:id/result', asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 422, 'VALIDATION_ERROR', 'The case id is invalid.');
  const record = await Case.findById(req.params.id).select('+solution +suspects.secretMotive +clues.pointsTo +clues.isRedHerring +hints.text +clues.image +clues.footage');
  if (!record) return fail(res, 404, 'NOT_FOUND', 'Case not found.');
  if (record.status !== 'completed') return fail(res, 403, 'FORBIDDEN', 'Accuse a suspect before viewing the result.');
  return res.json({ success: true, data: record.toPublic({ revealCompleted: true }) });
}));

export default router;
