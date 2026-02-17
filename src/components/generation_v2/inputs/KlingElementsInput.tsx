/**
 * KlingElementsInput
 *
 * Input component for Kling V3 reference elements.
 * Each element can have reference images (1-3) and a video.
 * Reference images use ImageUploadMultipleInput with url-input layout for full
 * upload infrastructure (previews, cropping, metadata). Video uses VideoInput
 * for upload, metadata extraction, and preview.
 */

import { ActionIcon, Button, Input, Stack, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type z from 'zod';
import type { klingV3ElementSchema } from '~/shared/data-graph/generation/kling-graph';
import { InfoPopover } from '~/components/InfoPopover/InfoPopover';
import { ImageUploadMultipleInput, type ImageValue } from './ImageUploadMultipleInput';
import { VideoInput, type VideoValue } from './VideoInput';

// =============================================================================
// Types
// =============================================================================

type KlingV3Element = z.infer<typeof klingV3ElementSchema>;

export interface KlingElementsInputProps {
  value: KlingV3Element[];
  onChange: (value: KlingV3Element[]) => void;
}

// =============================================================================
// Constants
// =============================================================================

const IMAGE_TOOLTIP =
  'Additional reference images from different angles. 1-3 images supported. At least one image is required.';

const VIDEO_TOOLTIP = `The video URL of the element. A request can only have one element with a video.

Max file size: 200.0MB, Min width: 720px, Min height: 720px, Max width: 2160px, Max height: 2160px, Min duration: 3.0s, Max duration: 10.05s, Min FPS: 24.0, Max FPS: 60.0, Timeout: 30.0s`;

// =============================================================================
// Component
// =============================================================================

export function KlingElementsInput({ value, onChange }: KlingElementsInputProps) {
  const elements = value ?? [];

  const addElement = () => {
    onChange([...elements, { frontalImage: null, referenceImages: [], videoUrl: null }]);
  };

  const removeElement = (index: number) => {
    onChange(elements.filter((_, i) => i !== index));
  };

  const updateElement = (index: number, update: Partial<KlingV3Element>) => {
    onChange(elements.map((el, i) => (i === index ? { ...el, ...update } : el)));
  };

  const handleImagesChange = (elementIndex: number, images: ImageValue[]) => {
    updateElement(elementIndex, {
      referenceImages: images.map(({ url, width, height }) => ({ url, width, height })),
    });
  };

  // Only one element can have a video
  const hasVideoElement = elements.some((el) => !!el.videoUrl);

  const handleVideoChange = (elementIndex: number, video: VideoValue | undefined) => {
    updateElement(elementIndex, {
      videoUrl: video ?? null,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Input.Label>Reference Elements</Input.Label>
      {elements.length === 0 && (
        <Text size="sm" c="dimmed">
          Add reference elements to guide video generation
        </Text>
      )}
      <Stack gap="xs">
        {elements.map((element, index) => (
          <div
            key={index}
            className="bg-gray-0 dark:bg-dark-6 flex flex-col gap-3 rounded-md border border-solid border-gray-3 p-3 dark:border-dark-4"
          >
            <div className="flex items-center justify-between">
              <Text size="sm" fw={500}>
                Element {index + 1}
              </Text>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => removeElement(index)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </div>

            {/* Reference Images */}
            <ImageUploadMultipleInput
              layout="url-input"
              max={3}
              label={
                <div className="flex items-center gap-1">
                  <span>Reference Images</span>
                  <InfoPopover size="xs" iconProps={{ size: 14 }} type="hover">
                    <Text size="sm">{IMAGE_TOOLTIP}</Text>
                  </InfoPopover>
                </div>
              }
              urlPlaceholder="Drop an image or provide a URL"
              urlHint="Supports JPEG, PNG, WebP"
              value={element.referenceImages ?? []}
              onChange={(images) => handleImagesChange(index, images)}
            />

            {/* Video */}
            <VideoInput
              layout="url-input"
              value={element.videoUrl ?? undefined}
              onChange={(video) => handleVideoChange(index, video)}
              label={
                <div className="flex items-center gap-1">
                  <span>Video</span>
                  <InfoPopover size="xs" iconProps={{ size: 14 }} type="hover">
                    <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                      {VIDEO_TOOLTIP}
                    </Text>
                  </InfoPopover>
                </div>
              }
              urlPlaceholder="Drop a video or provide a URL"
              urlHint="Supports MP4, WebM. Max 200MB."
              disabled={!element.videoUrl && hasVideoElement}
              maxHeight={200}
            />
          </div>
        ))}
      </Stack>
      <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addElement}>
        Add Element
      </Button>
    </div>
  );
}
