export function buildMysteryPrompt({ premise, difficulty, counts }, validationError = '') {
  return `You write logically solvable, fictional detective mysteries for players aged 13 and up. Return only JSON matching the supplied schema.

Premise: ${premise}
Difficulty: ${difficulty}
Exact counts: ${counts.suspects} suspects, ${counts.clues} clues, ${counts.hints} hints.

Output fields: title, setting, story, suspects [{name,role,description,statedAlibi,secretMotive}], culpritIndex, motive, method, explanation, clues [{title,content,type,relatedSuspectIndexes,pointsTo,isRedHerring}], hints [{text}], keyClueIndexes.

Consistency requirements:
- Return exactly the requested suspect, clue, and hint counts. Use unique fictional suspect names.
- There is exactly one culprit, identified only by culpritIndex.
- At least ${counts.culpritClues} clues have pointsTo='culprit' and relate to the culprit. Include at least ${counts.redHerrings} red herrings with pointsTo='innocent' that relate only to innocent suspects.
- Every suspect appears in at least one clue. The solution must be derivable from the clues alone.
- keyClueIndexes must refer to culprit-pointing clues. The explanation must cite every key clue by its exact title and explain how the clues fit together.
- No clue or hint may state the culprit's name outright. Hints progress from broad direction to a specific nudge without revealing the answer.
- Easy includes a clear contradiction. Hard requires cross-referencing multiple clues.
- For Easy, state the contradiction explicitly in one clue using clear language such as "contradicts" or "could not have". For Hard, provide at least two key clues that must be cross-referenced.
- Keep the premise fictional and non-graphic. Do not use real people, hateful content, graphic violence, or real brands in harmful contexts.
${validationError ? `\nYour last response failed validation: ${validationError}\nRegenerate the whole mystery and correct every issue.` : ''}`;
}
