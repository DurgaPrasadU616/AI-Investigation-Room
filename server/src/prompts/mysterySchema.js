export const mysteryResponseSchema = {
  type: 'object',
  required: ['title', 'setting', 'story', 'suspects', 'culpritIndex', 'motive', 'method', 'explanation', 'clues', 'hints', 'keyClueIndexes'],
  properties: {
    title: { type: 'string' },
    setting: { type: 'string' },
    story: { type: 'string' },
    suspects: { type: 'array', items: { type: 'object', required: ['name', 'role', 'description', 'statedAlibi', 'secretMotive'], properties: {
      name: { type: 'string' }, role: { type: 'string' }, description: { type: 'string' }, statedAlibi: { type: 'string' }, secretMotive: { type: 'string' },
    } } },
    culpritIndex: { type: 'integer' },
    motive: { type: 'string' },
    method: { type: 'string' },
    explanation: { type: 'string' },
    clues: { type: 'array', items: { type: 'object', required: ['title', 'content', 'type', 'relatedSuspectIndexes', 'pointsTo', 'isRedHerring'], properties: {
      title: { type: 'string' }, content: { type: 'string' }, type: { type: 'string', enum: ['chat', 'note', 'witness', 'object', 'log'] },
      relatedSuspectIndexes: { type: 'array', items: { type: 'integer' } }, pointsTo: { type: 'string', enum: ['culprit', 'innocent', 'neutral'] }, isRedHerring: { type: 'boolean' },
    } } },
    hints: { type: 'array', items: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } },
    keyClueIndexes: { type: 'array', items: { type: 'integer' } },
  },
};
