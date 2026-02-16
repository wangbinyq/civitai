/**
 * HiDream Family Graph V2
 *
 * Controls for HiDream ecosystem.
 * Meta contains only dynamic props - static props defined in components.
 *
 * HiDream has variants and precisions that affect available controls:
 * - Variants: fast, dev, full
 * - Precisions: fp8, fp16
 *
 * Control availability by variant:
 * - fast: cfgScale=1 (locked), no negativePrompt, sampler=LCM (locked), steps=16
 * - dev: cfgScale=1 (locked), no negativePrompt, sampler=LCM (locked), steps=28
 * - full: cfgScale=5, negativePrompt available, sampler=UniPC, steps=50
 *
 * Note: Supports LoRA resources. No CLIP skip.
 */

import { DataGraph } from '~/libs/data-graph/data-graph';
import type { GenerationCtx } from './context';
import {
  aspectRatioNode,
  cfgScaleNode,
  createCheckpointGraph,
  negativePromptNode,
  resourcesNode,
  samplerNode,
  seedNode,
  stepsNode,
  type VersionGroup,
  type ResourceData,
} from './common';


// =============================================================================
// HiDream Variant/Precision Constants
// =============================================================================

/** HiDream precision type */
export type HiDreamPrecision = 'fp8' | 'fp16';

/** HiDream variant type */
export type HiDreamVariant = 'fast' | 'dev' | 'full';

/** HiDream resource mapping */
const hiDreamResources = [
  { id: 1772448, variant: 'full' as const, precision: 'fp8' as const },
  { id: 1771369, variant: 'dev' as const, precision: 'fp8' as const },
  { id: 1770945, variant: 'fast' as const, precision: 'fp8' as const },
  { id: 1768354, variant: 'full' as const, precision: 'fp16' as const },
  { id: 1769068, variant: 'dev' as const, precision: 'fp16' as const },
  { id: 1768731, variant: 'fast' as const, precision: 'fp16' as const },
];

/** Map from version ID to resource entry */
const versionIdToResource = new Map(hiDreamResources.map((r) => [r.id, r]));

/** Map from version ID to variant */
const versionIdToVariant = new Map<number, HiDreamVariant>(
  hiDreamResources.map((r) => [r.id, r.variant])
);

/** Options for precision selector */
const precisionOptions = [
  { label: 'FP8', value: 'fp8' },
  { label: 'FP16', value: 'fp16' },
];

/** Options for variant selector (depends on precision) */
const variantOptionsByPrecision: Record<
  HiDreamPrecision,
  Array<{ label: string; value: string }>
> = {
  fp8: [
    { label: 'Fast', value: 'fast' },
    { label: 'Dev', value: 'dev' },
    { label: 'Full', value: 'full' },
  ],
  fp16: [
    { label: 'Fast', value: 'fast' },
    { label: 'Dev', value: 'dev' },
  ],
};

/**
 * Resolve a HiDream version ID from precision + variant.
 * Handles the cascade: if the requested combo doesn't exist (e.g. fp16 full),
 * falls back to 'dev' for the given precision.
 */
export function getHiDreamVersionId(precision: HiDreamPrecision, variant: HiDreamVariant): number {
  const match = hiDreamResources.find((r) => r.precision === precision && r.variant === variant);
  if (match) return match.id;
  // Fallback: requested variant unavailable for this precision (e.g. fp16 + full)
  const fallback = hiDreamResources.find((r) => r.precision === precision && r.variant === 'dev');
  return fallback!.id;
}

// =============================================================================
// Aspect Ratios
// =============================================================================

/** HiDream aspect ratios (1024px based) */
const hiDreamAspectRatios = [
  { label: '2:3', value: '2:3', width: 832, height: 1216 },
  { label: '1:1', value: '1:1', width: 1024, height: 1024 },
  { label: '3:2', value: '3:2', width: 1216, height: 832 },
];

// =============================================================================
// Variant Subgraphs
// =============================================================================

/** Context shape passed to HiDream variant subgraphs */
type HiDreamVariantCtx = {
  ecosystem: string;
  workflow: string;
  model: ResourceData;
  hiDreamVariant: HiDreamVariant;
};

/**
 * Fast/Dev mode subgraph: no negative prompt, fixed CFG/sampler/steps
 * Controls are mostly locked in these modes
 */
const fastDevModeGraph = new DataGraph<HiDreamVariantCtx, GenerationCtx>()
  .node('aspectRatio', aspectRatioNode({ options: hiDreamAspectRatios, defaultValue: '1:1' }))
  .node('seed', seedNode());

/**
 * Full mode subgraph: negative prompt available, configurable CFG/sampler/steps
 */
const fullModeGraph = new DataGraph<HiDreamVariantCtx, GenerationCtx>()
  .node(
    'resources',
    (ctx, ext) =>
      resourcesNode({
        ecosystem: ctx.ecosystem,
        limit: ext.limits.maxResources,
      }),
    ['ecosystem']
  )
  .node('aspectRatio', aspectRatioNode({ options: hiDreamAspectRatios, defaultValue: '1:1' }))
  .node('negativePrompt', negativePromptNode())
  .node(
    'sampler',
    samplerNode({
      options: ['UniPC'],
      defaultValue: 'UniPC',
    })
  )
  .node(
    'cfgScale',
    cfgScaleNode({
      min: 1,
      max: 20,
      defaultValue: 5,
    })
  )
  .node(
    'steps',
    stepsNode({
      min: 20,
      max: 100,
      defaultValue: 50,
    })
  )
  .node('seed', seedNode());

// =============================================================================
// HiDream Graph V2
// =============================================================================

/**
 * Hierarchical version options for HiDream.
 * Top level: precision (FP8/FP16), each with default model ID.
 * Second level: variant (Fast/Dev/Full), each mapping to a specific model version.
 */
const hiDreamVersions: VersionGroup = {
  label: 'Precision',
  options: [
    {
      label: 'FP8',
      value: 1771369, // default: fp8 dev
      children: {
        label: 'Variant',
        options: [
          { label: 'Fast', value: 1770945 },
          { label: 'Dev', value: 1771369 },
          { label: 'Full', value: 1772448 },
        ],
      },
    },
    {
      label: 'FP16',
      value: 1769068, // default: fp16 dev
      children: {
        label: 'Variant',
        options: [
          { label: 'Fast', value: 1768731 },
          { label: 'Dev', value: 1769068 },
        ],
      },
    },
  ],
};

/**
 * HiDream family controls.
 *
 * Meta only contains dynamic props - static props like label are in components.
 * Versions use a hierarchical VersionGroup (precision → variant → model ID).
 * Discriminates on 'hiDreamVariant' (computed from model.id):
 * - fast/dev: aspectRatio, seed (other controls locked/hidden)
 * - full: resources, aspectRatio, negativePrompt, sampler, cfgScale, steps, seed
 */
export const hiDreamGraph = new DataGraph<
  { ecosystem: string; workflow: string; model: ResourceData },
  GenerationCtx
>()
  .merge(
    () =>
      createCheckpointGraph({
        defaultModelId: 1771369, // fp8 dev as default
        versions: hiDreamVersions,
      }),
    []
  )
  // Computed variant for discriminator — derived from model.id
  .computed(
    'hiDreamVariant',
    (ctx) => (ctx.model?.id ? versionIdToVariant.get(ctx.model.id) : undefined) ?? 'dev',
    ['model']
  )
  .discriminator('hiDreamVariant', {
    fast: fastDevModeGraph,
    dev: fastDevModeGraph,
    full: fullModeGraph,
  });

// Export for use in components
export { hiDreamResources, precisionOptions, variantOptionsByPrecision };
