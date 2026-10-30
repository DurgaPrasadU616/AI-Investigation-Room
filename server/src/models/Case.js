import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  description: { type: String, required: true },
  statedAlibi: { type: String, required: true },
  secretMotive: { type: String, required: true, select: false },
});

const clueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['chat', 'note', 'witness', 'object', 'log'], required: true },
  relatedSuspectIds: [{ type: mongoose.Schema.Types.ObjectId }],
  pointsTo: { type: String, enum: ['culprit', 'innocent', 'neutral'], required: true, select: false },
  isRedHerring: { type: Boolean, required: true, select: false },
  image: { type: String, select: false },
  footage: { type: [String], select: false, default: undefined },
  discovered: { type: Boolean, default: false },
  discoveredAt: Date,
});

const hintSchema = new mongoose.Schema({
  text: { type: String, required: true, select: false },
  used: { type: Boolean, default: false },
});

const solutionSchema = new mongoose.Schema({
  culpritSuspectId: { type: mongoose.Schema.Types.ObjectId, required: true },
  motive: { type: String, required: true },
  method: { type: String, required: true },
  explanation: { type: String, required: true },
  keyClueIds: [{ type: mongoose.Schema.Types.ObjectId }],
}, { _id: false });

const caseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  premise: { type: String, required: true, minlength: 20, maxlength: 500 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  setting: { type: String, required: true },
  story: { type: String, required: true },
  suspects: { type: [suspectSchema], required: true },
  clues: { type: [clueSchema], required: true },
  hints: { type: [hintSchema], required: true },
  solution: { type: solutionSchema, required: true, select: false },
  progress: {
    cluesDiscovered: { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },
  },
  accusation: {
    suspectId: mongoose.Schema.Types.ObjectId,
    correct: Boolean,
    at: Date,
  },
  score: { base: Number, cluePoints: Number, hintPenalty: Number, total: Number },
  status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
}, { timestamps: true });

caseSchema.methods.toPublic = function toPublic({ revealCompleted = this.status === 'completed' } = {}) {
  const data = this.toObject({ getters: true });
  if (!revealCompleted || data.status !== 'completed') {
    delete data.solution;
    data.suspects = data.suspects.map((suspect) => { delete suspect.secretMotive; return suspect; });
    data.clues = data.clues.map((clue) => {
      delete clue.pointsTo;
      delete clue.isRedHerring;
      if (!clue.discovered) { delete clue.content; delete clue.image; delete clue.footage; }
      return clue;
    });
    data.hints = data.hints.map((hint) => { if (!hint.used) delete hint.text; return hint; });
  }
  return data;
};

export default mongoose.model('Case', caseSchema);
