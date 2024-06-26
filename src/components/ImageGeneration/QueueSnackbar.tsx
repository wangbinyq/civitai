import { Badge, Text, Button, createStyles, useMantineTheme, Progress, Card } from '@mantine/core';
import { GenerationStatusBadge } from '~/components/ImageGeneration/GenerationStatusBadge';
import { useGenerationContext } from '~/components/ImageGeneration/GenerationProvider';
import { IconBolt, IconHandStop } from '@tabler/icons-react';
import { generationStatusColors } from '~/shared/constants/generation.constants';
import { GenerationRequestStatus } from '~/server/common/enums';
import { NextLink } from '@mantine/next';
import { EdgeMedia } from '~/components/EdgeMedia/EdgeMedia';
import { generationPanel, generationStore } from '~/store/generation.store';
import { useRouter } from 'next/router';

export function QueueSnackbar() {
  const router = useRouter();
  const theme = useMantineTheme();
  const { classes, cx } = useStyles();
  const {
    queued,
    queueStatus,
    requestLimit,
    requestsRemaining,
    userTier,
    latestImage,
    requestsLoading,
  } = useGenerationContext((state) => state);
  const slots = Array(requestLimit).fill(0);
  const includeQueueLink = !router.pathname.includes('/generate');

  const { count, quantity } = queued.reduce(
    (acc, request) => {
      acc.count += request.count;
      acc.quantity += request.quantity;
      return acc;
    },
    {
      count: 0,
      quantity: 0,
    }
  );

  if (requestsLoading) return null;

  return (
    <div className="w-full flex flex-col gap-2 ">
      <Card
        radius="md"
        p={0}
        className={cx(classes.card, 'flex justify-center px-1 gap-3 items-stretch ')}
      >
        <div className="flex items-center basis-20 py-2 pl-1">
          {queueStatus && (
            <GenerationStatusBadge status={queueStatus} count={count} quantity={quantity} />
          )}
        </div>
        <div className="flex flex-col gap-1 items-center justify-center flex-1 py-2">
          <Text weight={500} className="flex gap-1 items-center">
            {!!queued.length ? (
              <>
                {(queueStatus === GenerationRequestStatus.Pending ||
                  queueStatus === GenerationRequestStatus.Processing) && (
                  <>
                    <span>{`${queued.length} job${queued.length > 0 && 's'} in `}</span>
                    {includeQueueLink ? (
                      <Text
                        inline
                        variant="link"
                        className="cursor-pointer"
                        onClick={() => generationPanel.setView('queue')}
                      >
                        queue
                      </Text>
                    ) : (
                      <span>queue</span>
                    )}
                  </>
                )}
                {queueStatus === GenerationRequestStatus.Succeeded && 'All jobs complete'}
                {queueStatus === GenerationRequestStatus.Error && 'Error with job'}
              </>
            ) : (
              `${requestsRemaining} jobs available`
            )}
          </Text>
          <div className="flex gap-2 w-full justify-center">
            {slots.map((slot, i) => {
              const item = queued[i];
              const colors = theme.fn.variant({
                color: item ? generationStatusColors[item.status] : 'gray',
                variant: 'light',
              });

              const progress = !item ? 0 : (item.count / item.quantity) * 100;
              return (
                <Progress
                  key={i}
                  color={item ? generationStatusColors[item.status] : 'gray'}
                  radius="xl"
                  value={progress}
                  h={6}
                  w="100%"
                  maw={32}
                  style={{ backgroundColor: item ? colors.background : undefined }}
                  className="flex-1"
                />
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-end basis-20 py-1">
          {latestImage && (
            <Card
              withBorder
              radius="md"
              p={0}
              style={{
                height: 42,
              }}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
              <img alt="" src={latestImage.url} className="max-h-full" />
            </Card>
          )}
        </div>
      </Card>
      {requestsRemaining <= 0 && userTier === 'free' && (
        <Badge color="yellow" h={'auto'} w="100%" p={0} radius="xl" classNames={classes}>
          <div className="flex justify-between items-center gap-2 p-0.5 flex-wrap w-full">
            <Text>
              <div className="flex items-center gap-1 pl-1">
                <IconHandStop size={16} />
                You can queue {requestLimit} jobs at once
              </div>
            </Text>
            <Button compact color="dark" radius="xl" component={NextLink} href="/pricing">
              <Text color="yellow">Increase</Text>
            </Button>
          </div>
        </Badge>
      )}
    </div>
  );
}

const useStyles = createStyles((theme) => ({
  card: {
    boxShadow: `inset 0 2px ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
    }`,

    // '&:hover': {
    //   backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[0],
    // },
  },
  inner: { width: '100%' },
}));
