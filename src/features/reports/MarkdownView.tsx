import { createElement } from 'react';
import type { JSX } from 'react';

import { parseMarkdown } from '../../core/markdown/miniMarkdown';
import type { Block, Inline } from '../../core/markdown/miniMarkdown';

function InlineText({ content }: { readonly content: readonly Inline[] }): JSX.Element {
  return (
    <>
      {content.map((part, index) => {
        const key = `${part.kind}-${String(index)}`;
        switch (part.kind) {
          case 'bold':
            return <strong key={key}>{part.text}</strong>;
          case 'italic':
            return <em key={key}>{part.text}</em>;
          case 'code':
            return <code key={key}>{part.text}</code>;
          case 'text':
            return <span key={key}>{part.text}</span>;
        }
      })}
    </>
  );
}

const HEADING_TAGS = ['h2', 'h3', 'h4', 'h5'] as const;

function BlockView({ block }: { readonly block: Block }): JSX.Element {
  switch (block.kind) {
    case 'heading': {
      // The screen already has its h1: the report's headings start at h2.
      return createElement(
        HEADING_TAGS.at(block.level - 1) ?? 'h5',
        null,
        <InlineText content={block.content} />,
      );
    }
    case 'paragraph':
      return (
        <p>
          <InlineText content={block.content} />
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag>
          {block.items.map((item, index) => (
            <li key={index}>
              <InlineText content={item} />
            </li>
          ))}
        </Tag>
      );
    }
  }
}

/** Markdown from the assistant drawn as React elements: nothing in it is ever read as HTML. */
export function MarkdownView({ source }: { readonly source: string }): JSX.Element {
  return (
    <>
      {parseMarkdown(source).map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </>
  );
}
