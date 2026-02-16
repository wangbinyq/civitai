import { ECO } from '~/shared/constants/basemodel.constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const CompatibilityRating = {
  GOOD: 'GOOD',
  OK: 'OK',
  NOISY: 'NOISY',
  DISTORTED: 'DISTORTED',
  BLACK: 'BLACK',
  WHITE: 'WHITE',
  SOLID_COLOR: 'SOLID_COLOR',
} as const;
export type CompatibilityRating = (typeof CompatibilityRating)[keyof typeof CompatibilityRating];

export const compatibilitySamplers = [
  'euler',
  'euler_a',
  'heun',
  'dpm2',
  'dpm++2s_a',
  'dpm++2m',
  'dpm++2mv2',
  'ipndm',
  'ipndm_v',
  'lcm',
  'ddim_trailing',
  'tcd',
  'res_multistep',
  'res_2s',
] as const;
export type CompatibilitySampler = (typeof compatibilitySamplers)[number];

export const compatibilitySchedulers = [
  'discrete',
  'karras',
  'exponential',
  'ays',
  'gits',
  'smoothstep',
  'sgm_uniform',
  'simple',
  'kl_optimal',
  'lcm',
  'bong_tangent',
] as const;
export type CompatibilityScheduler = (typeof compatibilitySchedulers)[number];

export type SamplerSchedulerEntry = {
  sampler: CompatibilitySampler;
  scheduler: CompatibilityScheduler;
  rating: CompatibilityRating;
};

// ---------------------------------------------------------------------------
// Compact encoding helpers
// ---------------------------------------------------------------------------

// Ratings are stored as single-char codes to keep the data compact.
const R = {
  G: CompatibilityRating.GOOD,
  O: CompatibilityRating.OK,
  N: CompatibilityRating.NOISY,
  D: CompatibilityRating.DISTORTED,
  B: CompatibilityRating.BLACK,
  W: CompatibilityRating.WHITE,
  S: CompatibilityRating.SOLID_COLOR,
} as const;
type Code = keyof typeof R;

// A row encodes 14 sampler ratings for one scheduler, in `compatibilitySamplers` order.
type Row = [Code, Code, Code, Code, Code, Code, Code, Code, Code, Code, Code, Code, Code, Code];
// A matrix encodes 11 scheduler rows in `compatibilitySchedulers` order.
type Matrix = [Row, Row, Row, Row, Row, Row, Row, Row, Row, Row, Row];

// ---------------------------------------------------------------------------
// Data — one matrix per ecosystem
// ---------------------------------------------------------------------------
// Row order:  discrete, karras, exponential, ays, gits, smoothstep,
//             sgm_uniform, simple, kl_optimal, lcm, bong_tangent
// Col order:  euler, euler_a, heun, dpm2, dpm++2s_a, dpm++2m, dpm++2mv2,
//             ipndm, ipndm_v, lcm, ddim_trailing, tcd, res_multistep, res_2s

const matrices: Record<number, Matrix> = {
  // ── Flux1 ─────────────────────────────────────────────────────────────
  [ECO.Flux1]: [
    /*discrete    */ ['G', 'D', 'G', 'N', 'D', 'N', 'G', 'G', 'G', 'D', 'N', 'N', 'N', 'N'],
    /*karras      */ ['O', 'D', 'O', 'O', 'D', 'O', 'O', 'O', 'O', 'D', 'N', 'N', 'O', 'O'],
    /*exponential */ ['O', 'D', 'O', 'O', 'D', 'O', 'O', 'O', 'O', 'D', 'N', 'N', 'O', 'O'],
    /*ays         */ ['B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'B', 'S', 'N', 'N', 'B', 'S'],
    /*gits        */ ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'B', 'N', 'N', 'N', 'N'],
    /*smoothstep  */ ['N', 'D', 'N', 'N', 'D', 'N', 'N', 'G', 'G', 'D', 'N', 'N', 'N', 'N'],
    /*sgm_uniform */ ['G', 'D', 'G', 'N', 'D', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'G', 'N'],
    /*simple      */ ['G', 'D', 'G', 'N', 'D', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'G', 'N'],
    /*kl_optimal  */ ['O', 'D', 'O', 'G', 'D', 'O', 'O', 'O', 'O', 'D', 'N', 'N', 'O', 'G'],
    /*lcm         */ ['N', 'D', 'N', 'N', 'D', 'N', 'N', 'N', 'N', 'D', 'N', 'N', 'N', 'N'],
    /*bong_tangent*/ ['N', 'D', 'N', 'N', 'D', 'N', 'N', 'N', 'N', 'D', 'N', 'N', 'N', 'N'],
  ],

  // ── Flux2 Klein 4B ────────────────────────────────────────────────────
  [ECO.Flux2Klein_4B]: [
    /*discrete    */ ['G', 'O', 'G', 'G', 'O', 'N', 'G', 'G', 'G', 'D', 'B', 'B', 'N', 'G'],
    /*karras      */ ['G', 'D', 'N', 'N', 'N', 'G', 'G', 'G', 'G', 'D', 'B', 'B', 'G', 'G'],
    /*exponential */ ['O', 'D', 'N', 'N', 'D', 'O', 'O', 'O', 'O', 'D', 'B', 'B', 'O', 'G'],
    /*ays         */ ['B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'B', 'S', 'D', 'B', 'B', 'S'],
    /*gits        */ ['N', 'N', 'N', 'N', 'D', 'N', 'N', 'N', 'N', 'D', 'N', 'N', 'N', 'N'],
    /*smoothstep  */ ['G', 'O', 'G', 'G', 'D', 'N', 'O', 'N', 'N', 'D', 'B', 'B', 'N', 'G'],
    /*sgm_uniform */ ['G', 'O', 'G', 'G', 'O', 'G', 'G', 'G', 'G', 'D', 'B', 'B', 'G', 'G'],
    /*simple      */ ['G', 'O', 'G', 'G', 'O', 'G', 'G', 'G', 'G', 'D', 'B', 'B', 'G', 'G'],
    /*kl_optimal  */ ['G', 'N', 'N', 'G', 'N', 'N', 'O', 'N', 'G', 'D', 'B', 'B', 'N', 'G'],
    /*lcm         */ ['G', 'O', 'G', 'G', 'O', 'G', 'G', 'G', 'G', 'D', 'B', 'B', 'G', 'G'],
    /*bong_tangent*/ ['G', 'D', 'G', 'G', 'D', 'N', 'O', 'G', 'G', 'D', 'B', 'B', 'N', 'G'],
  ],

  // ── Flux2 Klein 4B Base ───────────────────────────────────────────────
  [ECO.Flux2Klein_4B_base]: [
    /*discrete    */ ['G', 'D', 'G', 'G', 'D', 'N', 'G', 'G', 'G', 'D', 'N', 'N', 'N', 'G'],
    /*karras      */ ['D', 'D', 'D', 'O', 'N', 'D', 'O', 'D', 'D', 'D', 'N', 'N', 'D', 'O'],
    /*exponential */ ['D', 'D', 'D', 'O', 'N', 'D', 'D', 'D', 'D', 'D', 'N', 'N', 'D', 'O'],
    /*ays         */ ['B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'B', 'S', 'N', 'B', 'B', 'S'],
    /*gits        */ ['N', 'N', 'N', 'D', 'N', 'N', 'N', 'N', 'N', 'D', 'N', 'N', 'N', 'N'],
    /*smoothstep  */ ['G', 'D', 'G', 'G', 'N', 'G', 'O', 'G', 'G', 'D', 'N', 'N', 'G', 'G'],
    /*sgm_uniform */ ['G', 'D', 'G', 'G', 'D', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'G', 'G'],
    /*simple      */ ['G', 'D', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'G', 'G'],
    /*kl_optimal  */ ['O', 'N', 'G', 'G', 'N', 'O', 'O', 'O', 'O', 'D', 'N', 'N', 'O', 'G'],
    /*lcm         */ ['G', 'D', 'G', 'G', 'D', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'G', 'G'],
    /*bong_tangent*/ ['G', 'N', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'G', 'G'],
  ],

  // ── Flux2 Klein 9B ────────────────────────────────────────────────────
  [ECO.Flux2Klein_9B]: [
    /*discrete    */ ['G', 'O', 'G', 'N', 'G', 'N', 'G', 'G', 'G', 'D', 'W', 'W', 'N', 'N'],
    /*karras      */ ['G', 'N', 'N', 'N', 'N', 'N', 'O', 'N', 'N', 'N', 'W', 'W', 'N', 'N'],
    /*exponential */ ['O', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'W', 'W', 'N', 'N'],
    /*ays         */ ['B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'B', 'S', 'D', 'D', 'B', 'S'],
    /*gits        */ ['D', 'D', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'D', 'D', 'N', 'N'],
    /*smoothstep  */ ['G', 'O', 'N', 'N', 'O', 'N', 'O', 'N', 'N', 'D', 'W', 'W', 'N', 'N'],
    /*sgm_uniform */ ['G', 'O', 'N', 'N', 'O', 'G', 'G', 'G', 'G', 'D', 'W', 'W', 'N', 'N'],
    /*simple      */ ['G', 'O', 'N', 'N', 'O', 'N', 'G', 'G', 'G', 'D', 'W', 'W', 'G', 'N'],
    /*kl_optimal  */ ['G', 'N', 'N', 'G', 'N', 'N', 'O', 'N', 'N', 'D', 'W', 'W', 'N', 'G'],
    /*lcm         */ ['G', 'G', 'N', 'N', 'G', 'G', 'G', 'G', 'N', 'D', 'W', 'W', 'G', 'N'],
    /*bong_tangent*/ ['G', 'D', 'G', 'N', 'D', 'G', 'O', 'G', 'G', 'D', 'W', 'W', 'G', 'N'],
  ],

  // ── Flux2 Klein 9B Base ───────────────────────────────────────────────
  [ECO.Flux2Klein_9B_base]: [
    /*discrete    */ ['G', 'N', 'G', 'G', 'N', 'N', 'G', 'G', 'G', 'D', 'D', 'N', 'N', 'G'],
    /*karras      */ ['N', 'N', 'N', 'O', 'N', 'N', 'N', 'N', 'N', 'D', 'D', 'N', 'N', 'O'],
    /*exponential */ ['D', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'D', 'D', 'N', 'N', 'O'],
    /*ays         */ ['B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'B', 'S', 'N', 'B', 'B', 'S'],
    /*gits        */ ['N', 'N', 'N', 'N', 'D', 'N', 'N', 'N', 'N', 'D', 'N', 'D', 'N', 'D'],
    /*smoothstep  */ ['G', 'N', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'D', 'N', 'G', 'G'],
    /*sgm_uniform */ ['G', 'N', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'D', 'N', 'G', 'G'],
    /*simple      */ ['G', 'N', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'D', 'N', 'G', 'G'],
    /*kl_optimal  */ ['O', 'N', 'O', 'G', 'N', 'O', 'O', 'O', 'O', 'D', 'D', 'N', 'O', 'G'],
    /*lcm         */ ['G', 'N', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'D', 'N', 'G', 'G'],
    /*bong_tangent*/ ['G', 'N', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'D', 'N', 'G', 'G'],
  ],

  // ── Qwen ──────────────────────────────────────────────────────────────
  [ECO.Qwen]: [
    /*discrete    */ ['G', 'D', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'N', 'G'],
    /*karras      */ ['D', 'D', 'D', 'O', 'D', 'D', 'D', 'D', 'D', 'D', 'N', 'N', 'D', 'O'],
    /*exponential */ ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'N', 'N', 'D', 'D'],
    /*ays         */ ['B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'S'],
    /*gits        */ ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'B', 'N', 'N', 'N', 'N'],
    /*smoothstep  */ ['G', 'D', 'G', 'G', 'N', 'G', 'O', 'G', 'G', 'D', 'N', 'N', 'G', 'G'],
    /*sgm_uniform */ ['G', 'D', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'G', 'G'],
    /*simple      */ ['G', 'D', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'G', 'G'],
    /*kl_optimal  */ ['D', 'D', 'G', 'G', 'D', 'G', 'O', 'O', 'O', 'D', 'N', 'N', 'G', 'G'],
    /*lcm         */ ['G', 'D', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'D', 'N', 'N', 'G', 'G'],
    /*bong_tangent*/ ['G', 'D', 'G', 'G', 'N', 'G', 'G', 'G', 'G', 'W', 'N', 'N', 'G', 'G'],
  ],

  // ── SD 1.5 ────────────────────────────────────────────────────────────
  [ECO.SD1]: [
    /*discrete    */ ['G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G', 'D', 'G', 'G', 'N', 'G'],
    /*karras      */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*exponential */ ['G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G', 'D', 'G', 'G', 'G', 'G'],
    /*ays         */ ['G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*gits        */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*smoothstep  */ ['G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*sgm_uniform */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'D', 'G', 'G', 'G', 'G'],
    /*simple      */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'D', 'G', 'G', 'G', 'G'],
    /*kl_optimal  */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*lcm         */ ['G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G', 'D', 'G', 'G', 'G', 'G'],
    /*bong_tangent*/ ['G', 'O', 'G', 'G', 'O', 'G', 'G', 'N', 'N', 'D', 'G', 'G', 'G', 'G'],
  ],

  // ── SDXL ──────────────────────────────────────────────────────────────
  [ECO.SDXL]: [
    /*discrete    */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*karras      */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*exponential */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*ays         */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*gits        */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*smoothstep  */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*sgm_uniform */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'D', 'G', 'G', 'G', 'G'],
    /*simple      */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'D', 'G', 'G', 'G', 'G'],
    /*kl_optimal  */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*lcm         */ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'G', 'G', 'G', 'G'],
    /*bong_tangent*/ ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'D', 'G', 'G', 'G', 'G'],
  ],

  // ── ZImage Base ───────────────────────────────────────────────────────
  [ECO.ZImageBase]: [
    /*discrete    */ ['G', 'D', 'G', 'N', 'D', 'N', 'O', 'G', 'G', 'B', 'B', 'B', 'N', 'N'],
    /*karras      */ ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'B', 'B', 'B', 'D', 'D'],
    /*exponential */ ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'B', 'B', 'B', 'D', 'D'],
    /*ays         */ ['B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'S'],
    /*gits        */ ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
    /*smoothstep  */ ['G', 'D', 'G', 'G', 'D', 'O', 'N', 'G', 'G', 'B', 'B', 'B', 'N', 'G'],
    /*sgm_uniform */ ['G', 'D', 'G', 'N', 'D', 'G', 'G', 'G', 'G', 'B', 'B', 'B', 'G', 'N'],
    /*simple      */ ['G', 'D', 'G', 'N', 'D', 'G', 'G', 'G', 'G', 'B', 'B', 'B', 'G', 'N'],
    /*kl_optimal  */ ['D', 'D', 'D', 'O', 'D', 'D', 'O', 'D', 'D', 'B', 'B', 'B', 'D', 'O'],
    /*lcm         */ ['G', 'D', 'G', 'N', 'D', 'N', 'O', 'N', 'N', 'B', 'B', 'B', 'N', 'N'],
    /*bong_tangent*/ ['G', 'D', 'G', 'G', 'D', 'N', 'N', 'N', 'O', 'B', 'B', 'B', 'N', 'G'],
  ],

  // ── ZImage Turbo ──────────────────────────────────────────────────────
  [ECO.ZImageTurbo]: [
    /*discrete    */ ['G', 'D', 'G', 'G', 'D', 'N', 'G', 'G', 'G', 'D', 'B', 'B', 'N', 'G'],
    /*karras      */ ['N', 'N', 'N', 'N', 'D', 'N', 'N', 'N', 'N', 'D', 'B', 'B', 'N', 'N'],
    /*exponential */ ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'B', 'B', 'N', 'N'],
    /*ays         */ ['B', 'B', 'B', 'B', 'S', 'B', 'B', 'B', 'B', 'S', 'W', 'W', 'B', 'S'],
    /*gits        */ ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
    /*smoothstep  */ ['G', 'D', 'G', 'G', 'D', 'G', 'G', 'G', 'G', 'D', 'B', 'B', 'G', 'G'],
    /*sgm_uniform */ ['G', 'D', 'G', 'G', 'D', 'G', 'G', 'G', 'G', 'D', 'B', 'B', 'G', 'G'],
    /*simple      */ ['G', 'D', 'G', 'G', 'D', 'G', 'G', 'G', 'G', 'D', 'B', 'B', 'G', 'G'],
    /*kl_optimal  */ ['N', 'D', 'N', 'N', 'D', 'N', 'N', 'N', 'N', 'D', 'B', 'B', 'N', 'G'],
    /*lcm         */ ['G', 'D', 'G', 'G', 'D', 'G', 'G', 'G', 'G', 'D', 'B', 'B', 'G', 'G'],
    /*bong_tangent*/ ['G', 'D', 'G', 'G', 'D', 'G', 'G', 'G', 'G', 'D', 'B', 'B', 'G', 'G'],
  ],
};

const DEFAULT_ECOSYSTEM = ECO.SD1;

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

function getMatrix(ecosystemId: number): Matrix {
  return matrices[ecosystemId] ?? matrices[DEFAULT_ECOSYSTEM];
}

/** Get all sampler/scheduler entries with their ratings for an ecosystem.
 *  Falls back to SD1 data for unmapped ecosystems. */
export function getEcosystemCompatibility(ecosystemId: number): SamplerSchedulerEntry[] {
  const matrix = getMatrix(ecosystemId);
  const entries: SamplerSchedulerEntry[] = [];
  for (let si = 0; si < compatibilitySchedulers.length; si++) {
    const row = matrix[si];
    for (let sa = 0; sa < compatibilitySamplers.length; sa++) {
      entries.push({
        sampler: compatibilitySamplers[sa],
        scheduler: compatibilitySchedulers[si],
        rating: R[row[sa]],
      });
    }
  }
  return entries;
}

/** Get the rating for a specific sampler+scheduler in an ecosystem.
 *  Falls back to SD1 data for unmapped ecosystems. */
export function getCompatibilityRating(
  ecosystemId: number,
  sampler: string,
  scheduler: string
): CompatibilityRating | undefined {
  const si = (compatibilitySchedulers as readonly string[]).indexOf(scheduler);
  const sa = (compatibilitySamplers as readonly string[]).indexOf(sampler);
  if (si === -1 || sa === -1) return undefined;
  const matrix = getMatrix(ecosystemId);
  return R[matrix[si][sa]];
}
