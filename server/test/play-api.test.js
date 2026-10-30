import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';
import Case from '../src/models/Case.js';

test('play API hides secrets, calculates score server-side, and locks accusation', async (t) => {
  await connectDatabase();
  const fixturePremise = 'The M3 integration fixture ledger vanished during a quiet archive afternoon.';
  await Case.deleteMany({ premise: fixturePremise });
  let fixtureId;
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    if (fixtureId) await Case.deleteOne({ _id: fixtureId });
    server.close();
    await mongoose.disconnect();
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/cases`;
  const culpritId = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();
  const caseDoc = await Case.create({
    title: 'The Missing Ledger', premise: fixturePremise, difficulty: 'easy', setting: 'An old archive', story: 'The archivist found an empty shelf.',
    suspects: [
      { _id: culpritId, name: 'Mara Vale', role: 'Archivist', description: 'Maintains the shelves.', statedAlibi: 'She catalogued books.', secretMotive: 'She wanted to hide an old debt.' },
      { _id: otherId, name: 'Jon Bell', role: 'Visitor', description: 'A regular visitor.', statedAlibi: 'He read in the lobby.', secretMotive: 'None.' },
      { name: 'Ira Moss', role: 'Guard', description: 'Watched the entrance.', statedAlibi: 'He stayed at the desk.', secretMotive: 'None.' },
    ],
    clues: [{ title: 'Dust Line', content: 'A fresh mark crossed the shelf dust.', type: 'object', relatedSuspectIds: [culpritId], pointsTo: 'culprit', isRedHerring: false, discovered: false }],
    hints: [{ text: 'Look at who had routine access.', used: false }, { text: 'The dust mark was made recently.', used: false }],
    solution: { culpritSuspectId: culpritId, motive: 'Hide a debt', method: 'Removed it during cataloguing', explanation: 'The Dust Line shows recent access.', keyClueIds: [] },
    progress: { cluesDiscovered: 0, hintsUsed: 0 }, status: 'active',
  });
  fixtureId = caseDoc._id;
  const id = caseDoc._id.toString();
  const get = (path, options) => fetch(`${baseUrl}/${id}${path}`, options);

  const before = await (await get('')).json();
  const json = JSON.stringify(before);
  for (const secret of ['solution', 'pointsTo', 'isRedHerring', 'secretMotive', 'Look at who', 'A fresh mark crossed the shelf dust']) assert.equal(json.includes(secret), false, `public response leaked ${secret}`);

  const resultBeforeAccusation = await get('/result');
  assert.equal(resultBeforeAccusation.status, 403);

  const clueId = caseDoc.clues[0]._id.toString();
  assert.equal((await get(`/clues/${clueId}/discover`, { method: 'POST' })).status, 200);
  assert.equal((await get('/hints', { method: 'POST' })).status, 200);
  const accused = await get('/accuse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suspectId: culpritId.toString(), score: 999999 }) });
  assert.equal(accused.status, 200);
  const accusation = await accused.json();
  assert.deepEqual(accusation.data.score, { base: 100, cluePoints: 5, hintPenalty: 10, total: 95 });
  const second = await get('/accuse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suspectId: otherId.toString() }) });
  assert.equal(second.status, 409);
  const revealed = await get('/result');
  assert.equal(revealed.status, 200);
  assert.equal((await revealed.json()).data.solution.culpritSuspectId, culpritId.toString());
});
