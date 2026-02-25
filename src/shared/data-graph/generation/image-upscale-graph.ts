/**
 * Image Upscale Graph
 *
 * Graph for image upscale workflow (img2img:upscale).
 * This workflow has no ecosystem support - it operates on existing images
 * to increase resolution through upscaling.
 *
 * Note: This graph defines its own 'images' node since it doesn't use ecosystemGraph.
 */

import z from 'zod';
import { DataGraph } from '~/libs/data-graph/data-graph';
import type { GenerationCtx } from './context';
import { imagesNode } from './common';

// =============================================================================
// Constants
// =============================================================================

/** Maximum output resolution (longest side) for upscaled images */
const MAX_OUTPUT_RESOLUTION = 4096;

/** Available upscale multipliers (applied to source dimensions) */
const UPSCALE_MULTIPLIERS = [2, 3, 4] as const;

/** Available target resolution presets (longest side in pixels) */
const UPSCALE_RESOLUTIONS = [
  { label: '2K', value: 2048 },
  { label: '4K', value: 3840 },
] as const;

// =============================================================================
// Types
// =============================================================================

export interface UpscaleDimensionOption {
  label: string;
  width: number;
  height: number;
  disabled: boolean;
}

export interface TargetDimensionsMeta {
  sourceWidth: number | undefined;
  sourceHeight: number | undefined;
  maxOutputResolution: number;
  multiplierOptions: UpscaleDimensionOption[];
  resolutionOptions: UpscaleDimensionOption[];
  canUpscale: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Compute upscale target dimensions maintaining aspect ratio.
 * The longest side is set to `target`, the other side is scaled proportionally.
 * Both sides are aligned to 64px boundaries.
 */
function computeUpscaleDimensions(
  sourceWidth: number,
  sourceHeight: number,
  target: number
): { width: number; height: number } {
  const aspectRatio = sourceWidth / sourceHeight;
  let width: number;
  let height: number;

  if (sourceWidth >= sourceHeight) {
    width = target;
    height = Math.round(target / aspectRatio);
  } else {
    width = Math.round(target * aspectRatio);
    height = target;
  }

  return {
    width: Math.ceil(width / 64) * 64,
    height: Math.ceil(height / 64) * 64,
  };
}

// =============================================================================
// Image Upscale Graph
// =============================================================================

/**
 * Image upscale graph definition.
 *
 * Nodes:
 * - images: Source image (max 1)
 * - targetDimensions: Target output dimensions { width, height }
 *
 * The available upscale options (multipliers and resolution presets) are
 * exposed via the node meta so the UI can render preset buttons.
 */
export const imageUpscaleGraph = new DataGraph<Record<never, never>, GenerationCtx>()
  // Images node - upscale only allows 1 image
  .node('images', () => imagesNode(), [])
  // Target dimensions - direct width/height input with preset options in meta
  .node(
    'targetDimensions',
    (ctx) => {
      const image = ctx.images?.[0];
      const sourceWidth = image?.width;
      const sourceHeight = image?.height;
      const maxDimension =
        sourceWidth && sourceHeight ? Math.max(sourceWidth, sourceHeight) : undefined;

      // Build multiplier options
      const multiplierOptions: UpscaleDimensionOption[] =
        sourceWidth && sourceHeight
          ? UPSCALE_MULTIPLIERS.map((multiplier) => {
              const target = Math.max(sourceWidth, sourceHeight) * multiplier;
              const dims = computeUpscaleDimensions(sourceWidth, sourceHeight, target);
              return {
                label: `x${multiplier}`,
                ...dims,
                disabled: Math.max(dims.width, dims.height) > MAX_OUTPUT_RESOLUTION,
              };
            })
          : [];

      // Build resolution options
      const resolutionOptions: UpscaleDimensionOption[] =
        sourceWidth && sourceHeight
          ? UPSCALE_RESOLUTIONS.map(({ label, value: targetRes }) => {
              const dims = computeUpscaleDimensions(sourceWidth, sourceHeight, targetRes);
              return {
                label,
                ...dims,
                disabled:
                  targetRes <= maxDimension! ||
                  Math.max(dims.width, dims.height) > MAX_OUTPUT_RESOLUTION,
              };
            })
          : [];

      // Default to x2 if possible
      const defaultOption = multiplierOptions.find((o) => !o.disabled);
      const defaultValue = defaultOption
        ? { width: defaultOption.width, height: defaultOption.height }
        : undefined;

      const canUpscale =
        multiplierOptions.some((o) => !o.disabled) || resolutionOptions.some((o) => !o.disabled);

      return {
        input: z.object({ width: z.number().int(), height: z.number().int() }).optional(),
        output: z
          .object({ width: z.number().int(), height: z.number().int() })
          .refine((val) => Math.max(val.width, val.height) <= MAX_OUTPUT_RESOLUTION, {
            message: `Output dimensions must not exceed ${MAX_OUTPUT_RESOLUTION}px`,
          }),
        defaultValue,
        meta: {
          sourceWidth,
          sourceHeight,
          maxOutputResolution: MAX_OUTPUT_RESOLUTION,
          multiplierOptions,
          resolutionOptions,
          canUpscale,
        } satisfies TargetDimensionsMeta,
      };
    },
    ['images']
  );

/** Type helper for the image upscale graph context */
export type ImageUpscaleGraphCtx = ReturnType<typeof imageUpscaleGraph.init>;
