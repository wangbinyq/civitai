import { useMantineTheme } from '@mantine/core';
import type { IconProps } from '@tabler/icons-react';
import {
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled,
} from '@tabler/icons-react';

export function ThumbsUpIcon({ filled, ...iconProps }: Props) {
  const theme = useMantineTheme();

  return filled ? (
    <IconThumbUpFilled
      {...iconProps}
      color={theme.colorScheme === 'dark' ? undefined : theme.white}
    />
  ) : (
    <IconThumbUp {...iconProps} />
  );
}

export function ThumbsDownIcon({ filled, ...iconProps }: Props) {
  const theme = useMantineTheme();

  return filled ? (
    <IconThumbDownFilled
      {...iconProps}
      color={theme.colorScheme === 'dark' ? undefined : theme.white}
    />
  ) : (
    <IconThumbDown {...iconProps} />
  );
}

type Props = IconProps & { filled?: boolean };
