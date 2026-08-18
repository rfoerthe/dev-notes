export type MarkdownHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface MarkdownHeading {
  id: string;
  level: MarkdownHeadingLevel;
  line: number;
  text: string;
}

export const slugifyHeadingText = (text: string): string => (
  text
    .replace(/([\p{Ll}\p{Nd}])([\p{Lu}])/gu, '$1 $2')
    .replace(/([\p{Lu}]+)([\p{Lu}][\p{Ll}])/gu, '$1 $2')
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
);

const stripInlineMarkdown = (text: string): string => (
  text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]+/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
);

const getAtxHeading = (line: string): { level: MarkdownHeadingLevel; text: string } | null => {
  const match = line.match(/^\s{0,3}(#{1,6})(?:\s+|$)(.*)$/);

  if (!match) {
    return null;
  }

  const text = stripInlineMarkdown(match[2].replace(/\s+#+\s*$/, ''));

  if (!text) {
    return null;
  }

  return {
    level: match[1].length as MarkdownHeadingLevel,
    text,
  };
};

const getSetextHeadingLevel = (line: string): 1 | 2 | null => {
  if (/^\s{0,3}=+\s*$/.test(line)) {
    return 1;
  }

  if (/^\s{0,3}-+\s*$/.test(line)) {
    return 2;
  }

  return null;
};

const isBlankLine = (line?: string): boolean => line === undefined || line.trim() === '';

// Display math is skipped like a code fence: LaTeX lines such as a lone `=`
// between two matrices would otherwise read as a setext underline and turn the
// line above it into a heading. Both the bare `$$` fence and the lenient forms
// `$$…$$` / `$$…` that `normalizeMathBlocks` accepts are recognised here.
const MATH_OPENING_REGEX = /^[ \t>]*(?:(?:[-*+]|\d+[.)])[ \t]+)?\$\$(.*)$/;
const MATH_CLOSING_REGEX = /\$\$[ \t]*$/;

export const extractMarkdownHeadings = (markdown: string): MarkdownHeading[] => {
  const headings: MarkdownHeading[] = [];
  const slugCounts = new Map<string, number>();
  const lines = markdown.split(/\r?\n/);
  let fenceMarker: string | null = null;
  let inMathBlock = false;

  const addHeading = (level: MarkdownHeadingLevel, text: string, line: number) => {
    const slug = slugifyHeadingText(text);

    if (!slug) {
      return;
    }

    const count = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, count + 1);
    headings.push({
      id: count === 0 ? slug : `${slug}-${count}`,
      level,
      line,
      text,
    });
  };

  lines.forEach((line, index) => {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fenceMarker === marker) {
        fenceMarker = null;
      } else if (!fenceMarker) {
        fenceMarker = marker;
      }
      return;
    }

    if (fenceMarker) {
      return;
    }

    if (inMathBlock) {
      if (MATH_CLOSING_REGEX.test(line)) {
        inMathBlock = false;
      }
      return;
    }

    const mathOpening = line.match(MATH_OPENING_REGEX);

    if (mathOpening) {
      const rest = mathOpening[1];

      // `$$$…` is not a fence we understand, and `$$…$$` closes on its own line.
      if (!rest.startsWith('$') && !(rest.trim() !== '' && MATH_CLOSING_REGEX.test(rest))) {
        inMathBlock = true;
      }
      return;
    }

    const atxHeading = getAtxHeading(line);

    if (atxHeading) {
      addHeading(atxHeading.level, atxHeading.text, index + 1);
      return;
    }

    const setextLevel = getSetextHeadingLevel(lines[index + 1] ?? '');

    if (!setextLevel || isBlankLine(line) || /^\s{0,3}[-*_]{3,}\s*$/.test(line)) {
      return;
    }

    addHeading(setextLevel, stripInlineMarkdown(line), index + 1);
  });

  return headings;
};

export const createHeadingIdsByLine = (markdown: string): Map<number, string> => (
  new Map(extractMarkdownHeadings(markdown).map((heading) => [heading.line, heading.id]))
);
