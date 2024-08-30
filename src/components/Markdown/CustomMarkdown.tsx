import { Table } from '@mantine/core';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ReactMarkdownOptions } from 'react-markdown/lib/react-markdown';

type CustomOptions = ReactMarkdownOptions & {
  allowExternalVideo?: boolean;
};

export function CustomMarkdown({
  allowExternalVideo,
  components,
  className = 'markdown-content',
  ...options
}: CustomOptions) {
  return (
    <ReactMarkdown
      {...options}
      className={className}
      components={{
        ...components,
        a: ({ node, href, ...props }) => {
          if (!href) return <a {...props}>{props.children?.[0]}</a>;
          if (
            allowExternalVideo &&
            videoKeysRequirements.some((requirements) =>
              requirements.every((item) => href?.includes(item))
            )
          ) {
            return (
              <div className="relative mx-auto aspect-video max-w-sm">
                <iframe
                  allowFullScreen
                  src={href}
                  className="absolute inset-0 border-none"
                ></iframe>
              </div>
            );
          }

          const isExternalLink = href.startsWith('http');
          if (typeof window !== 'undefined')
            href = href.replace('//civitai.com', `//${location.host}`);

          return (
            <Link href={href} passHref>
              <a target={isExternalLink ? '_blank' : '_self'} rel="nofollow noreferrer">
                {props.children?.[0]}
              </a>
            </Link>
          );
        },
        table: ({ node, ...props }) => {
          return (
            <Table {...props} striped withBorder withColumnBorders>
              {props.children}
            </Table>
          );
        },
      }}
    />
  );
}

const videoKeysRequirements = [
  ['youtube', 'embed'],
  ['drive.google.com', 'preview'],
];