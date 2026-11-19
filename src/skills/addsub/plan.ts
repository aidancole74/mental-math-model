/**
 * Left-to-right plans: the sequence of moves a person makes in their head.
 * The same plan produces the answer AND the walkthrough, so they can't disagree.
 */

export interface Move {
  op: '+' | '−';
  amount: number;
  before: number;
  after: number;
  /** What this move is, in words: "the hundreds", "the tens", ... */
  role: 'hundreds' | 'tens' | 'ones' | 'round-up' | 'give-back';
}

/** 538 -> [{500,'hundreds'}, {30,'tens'}, {8,'ones'}], skipping zero parts. */
export function placeParts(n: number): { amount: number; role: 'hundreds' | 'tens' | 'ones' }[] {
  const parts: { amount: number; role: 'hundreds' | 'tens' | 'ones' }[] = [];
  const h = Math.floor(n / 100) * 100;
  const t = Math.floor((n % 100) / 10) * 10;
  const o = n % 10;
  if (h) parts.push({ amount: h, role: 'hundreds' });
  if (t) parts.push({ amount: t, role: 'tens' });
  if (o) parts.push({ amount: o, role: 'ones' });
  return parts;
}

/** a + b, adding b's biggest piece first. b must be under 1000. */
export function additionPlan(a: number, b: number): Move[] {
  let cur = a;
  return placeParts(b).map(({ amount, role }) => {
    const before = cur;
    cur += amount;
    return { op: '+', amount, before, after: cur, role };
  });
}

/**
 * a − b, biggest piece first. When b's last digit is 7, 8 or 9, round the
 * last two digits up to the next ten, subtract that, then give the extra back
 * (83 − 47 → 83 − 50 = 33, + 3 = 36). b must be under 1000.
 */
export function subtractionPlan(a: number, b: number): Move[] {
  const moves: Move[] = [];
  let cur = a;
  const push = (op: '+' | '−', amount: number, role: Move['role']): void => {
    const before = cur;
    cur = op === '+' ? cur + amount : cur - amount;
    moves.push({ op, amount, before, after: cur, role });
  };

  const hundreds = Math.floor(b / 100) * 100;
  const tens = Math.floor((b % 100) / 10) * 10;
  const ones = b % 10;

  if (hundreds) push('−', hundreds, 'hundreds');
  if (ones >= 7) {
    push('−', tens + 10, 'round-up');
    push('+', 10 - ones, 'give-back');
  } else {
    if (tens) push('−', tens, 'tens');
    if (ones) push('−', ones, 'ones');
  }
  return moves;
}

export function finalValue(start: number, moves: Move[]): number {
  return moves.length ? (moves[moves.length - 1] as Move).after : start;
}
