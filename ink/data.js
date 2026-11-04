// The Ink of Light desk (first version) uses the earlier chart kinds; map today's data onto them.
export * from '../data.js'
import { ITEMS as NOW } from '../data.js'
const OLD = {
  lolli: (v) => ({ kind: 'bars', rows: v.rows, neg: true }),
  cliff: () => ({ kind: 'flat' }),
  area: (v) => ({ kind: 'spark', points: v.points }),
  hist: () => ({ kind: 'stars', n: 5, filled: 4.8 }),
  wave: () => ({ kind: 'wave' }),
  lead: (v) => ({ kind: 'face', initials: v.initials }),
  ring: (v) => ({ kind: 'dots', n: v.n, on: v.on.length }),
  gauge: (v) => ({ kind: 'ring', pct: v.pct }),
  slots: (v) => ({ kind: 'cal', slots: v.slots }),
  aging: () => ({ kind: 'tally', n: 3 }),
  plus: () => ({ kind: 'plus' }),
  week: () => ({ kind: 'clock' }),
}
export const ITEMS = NOW.map((it) => ({ ...it, viz: OLD[it.viz.kind] ? OLD[it.viz.kind](it.viz) : it.viz }))
