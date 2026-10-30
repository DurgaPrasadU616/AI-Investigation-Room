export const DIFFICULTY = Object.freeze({
  easy: Object.freeze({ suspects: 3, clues: 5, hints: 2, baseScore: 100, culpritClues: 2, redHerrings: 1 }),
  medium: Object.freeze({ suspects: 4, clues: 7, hints: 3, baseScore: 150, culpritClues: 3, redHerrings: 2 }),
  hard: Object.freeze({ suspects: 5, clues: 9, hints: 3, baseScore: 200, culpritClues: 3, redHerrings: 2 }),
});
