/**
 * A small, safe Markdown reader for the narrative report: headings, paragraphs, bullet and numbered
 * lists, and bold, italic and code inside a line. It returns data, never HTML: the screen builds
 * React elements from it, so text such as "<script>" stays text.
 */

export type Inline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'bold'; readonly text: string }
  | { readonly kind: 'italic'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string };

export type Block =
  | { readonly kind: 'heading'; readonly level: number; readonly content: readonly Inline[] }
  | { readonly kind: 'paragraph'; readonly content: readonly Inline[] }
  | {
      readonly kind: 'list';
      readonly ordered: boolean;
      readonly items: readonly (readonly Inline[])[];
    };

/** Deepest heading the report uses; `####` and beyond all read as level 4. */
export const MAX_HEADING_LEVEL = 4;

const HEADING = /^(?<marks>#+)\s+(?<text>.*\S)\s*$/;
const BULLET = /^\s*[-*+]\s+(?<text>.*\S)\s*$/;
const NUMBERED = /^\s*\d+[.)]\s+(?<text>.*\S)\s*$/;
const INLINE = /\*\*(?<bold>[^*]+)\*\*|`(?<code>[^`]+)`|\*(?<star>[^*]+)\*|_(?<under>[^_]+)_/g;

export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of line.matchAll(INLINE)) {
    const start = match.index;
    if (start > last) {
      out.push({ kind: 'text', text: line.slice(last, start) });
    }
    const { bold, code, star, under } = match.groups ?? {};
    if (bold !== undefined) {
      out.push({ kind: 'bold', text: bold });
    } else if (code !== undefined) {
      out.push({ kind: 'code', text: code });
    } else {
      out.push({ kind: 'italic', text: star ?? under ?? '' });
    }
    last = start + match[0].length;
  }
  if (last < line.length) {
    out.push({ kind: 'text', text: line.slice(last) });
  }
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: Inline[][] } | null = null;

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', content: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
  };
  const flushList = (): void => {
    if (list !== null) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
      list = null;
    }
  };

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = HEADING.exec(raw)?.groups;
    const bullet = BULLET.exec(raw)?.groups;
    const numbered = NUMBERED.exec(raw)?.groups;
    if (raw.trim() === '') {
      flushParagraph();
      flushList();
    } else if (heading !== undefined) {
      flushParagraph();
      flushList();
      const level = Math.min(heading.marks?.length ?? 1, MAX_HEADING_LEVEL);
      blocks.push({ kind: 'heading', level, content: parseInline(heading.text ?? '') });
    } else if (bullet !== undefined || numbered !== undefined) {
      flushParagraph();
      const ordered = bullet === undefined;
      if (list !== null && list.ordered !== ordered) {
        flushList();
      }
      list ??= { ordered, items: [] };
      list.items.push(parseInline((bullet ?? numbered)?.text ?? ''));
    } else {
      flushList();
      paragraph.push(raw.trim());
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}
