import { Alert, Input } from '@mantine/core';
import { Radio } from '~/libs/form/components/RadioGroup';
import type {
  TargetDimensionsMeta,
  UpscaleDimensionOption,
} from '~/shared/data-graph/generation/image-upscale-graph';

// =============================================================================
// Types
// =============================================================================

export interface UpscaleDimensionsInputProps {
  value?: { width: number; height: number };
  onChange?: (value: { width: number; height: number }) => void;
  meta: TargetDimensionsMeta;
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function UpscaleDimensionsInput({
  value,
  onChange,
  meta,
  disabled,
}: UpscaleDimensionsInputProps) {
  const { sourceWidth, sourceHeight, maxOutputResolution, multiplierOptions, resolutionOptions } =
    meta;

  if (!sourceWidth || !sourceHeight) {
    return (
      <Input.Wrapper label="Upscale">
        <div className="text-dimmed text-sm">Waiting for source dimensions...</div>
      </Input.Wrapper>
    );
  }

  if (!meta.canUpscale) {
    return (
      <Input.Wrapper label="Upscale">
        <Alert color="yellow">
          This image cannot be upscaled further. Maximum output resolution is{' '}
          {maxOutputResolution}px.
        </Alert>
      </Input.Wrapper>
    );
  }

  // Use max dimension as the comparison key (unique per option)
  const selectedKey = value ? Math.max(value.width, value.height) : undefined;

  function handleSelect(option: UpscaleDimensionOption) {
    if (!option.disabled) {
      onChange?.({ width: option.width, height: option.height });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {multiplierOptions.length > 0 && (
        <OptionGroup
          label="Upscale Multiplier"
          options={multiplierOptions}
          selectedKey={selectedKey}
          onSelect={handleSelect}
          disabled={disabled}
        />
      )}

      {resolutionOptions.length > 0 && (
        <OptionGroup
          label="Upscale Resolution"
          options={resolutionOptions}
          selectedKey={selectedKey}
          onSelect={handleSelect}
          disabled={disabled}
        />
      )}

      {/* Display source and target dimensions */}
      <div className="rounded-md bg-gray-2 px-4 py-3 dark:bg-dark-6">
        <div className="flex justify-between text-sm">
          <span className="text-dimmed">Source:</span>
          <span>
            {sourceWidth} × {sourceHeight}
          </span>
        </div>
        {value && (
          <div className="flex justify-between text-sm">
            <span className="font-medium">Upscaled:</span>
            <span className="font-medium">
              {value.width} × {value.height}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Option Group
// =============================================================================

function OptionGroup({
  label,
  options,
  selectedKey,
  onSelect,
  disabled,
}: {
  label: string;
  options: UpscaleDimensionOption[];
  selectedKey: number | undefined;
  onSelect: (option: UpscaleDimensionOption) => void;
  disabled?: boolean;
}) {
  // Use max dimension as radio value for comparison
  const radioValue = selectedKey;

  return (
    <Input.Wrapper label={label}>
      <Radio.Group
        value={radioValue}
        onChange={(key: number) => {
          const option = options.find((o) => Math.max(o.width, o.height) === key);
          if (option) onSelect(option);
        }}
        className="flex gap-2"
        disabled={disabled}
      >
        {options.map((option) => (
          <Radio.Item
            key={`${option.width}x${option.height}`}
            value={Math.max(option.width, option.height)}
            label={option.label}
            disabled={option.disabled}
          />
        ))}
      </Radio.Group>
    </Input.Wrapper>
  );
}
