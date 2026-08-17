/**
 * Normalises display math to the shape `remark-math` understands.
 *
 * `remark-math` only recognises a display block when the opening and the
 * closing `$$` each stand alone on their own line. GitHub, Obsidian, Pandoc
 * and most editors are more forgiving and also accept
 *
 *     $$E = mc^2$$
 *
 *     $$\frac{a}{b}
 *     \qquad \sqrt{x}$$
 *
 * With `remark-math` the first form renders *inline*, and the second one
 * swallows everything up to the end of the document, because the rest of the
 * opening line is treated as fence meta and no bare `$$` line ever closes the
 * block. This pass rewrites both forms into
 *
 *     $$
 *     …
 *     $$
 *
 * so authors can use whichever notation they are used to. Fenced code blocks
 * are skipped, and blockquote/list prefixes are carried onto every emitted
 * line so the block stays inside its container.
 */

const FENCE_REGEX = /^\s{0,3}(`{3,}|~{3,})/;
// Optional blockquote markers and indentation, then an optional list marker.
const OPENING_REGEX = /^([ \t>]*(?:(?:[-*+]|\d+[.)])[ \t]+)?)\$\$(.*)$/;
const CLOSING_SUFFIX_REGEX = /^(.*?)\$\$[ \t]*$/;

const toContinuationPrefix = (prefix: string): string => prefix.replace(/[^ \t>]/g, ' ');

const isBareFence = (line: string, prefix: string): boolean => {
  if (!line.startsWith(prefix.trimEnd())) {
    return false;
  }

  return line.slice(prefix.trimEnd().length).trim() === '$$';
};

export const normalizeMathBlocks = (markdown: string): string => {
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let fenceMarker: string | null = null;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const fenceMatch = line.match(FENCE_REGEX);

    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fenceMarker === marker) {
        fenceMarker = null;
      } else if (!fenceMarker) {
        fenceMarker = marker;
      }
      output.push(line);
      index += 1;
      continue;
    }

    if (fenceMarker) {
      output.push(line);
      index += 1;
      continue;
    }

    const opening = line.match(OPENING_REGEX);

    if (!opening) {
      output.push(line);
      index += 1;
      continue;
    }

    const [, prefix, rest] = opening;
    const continuation = toContinuationPrefix(prefix);

    // Already a bare opening fence: copy the block through to its closing
    // fence untouched (or to the end of the document when it never closes).
    if (rest.trim() === '') {
      output.push(line);
      index += 1;
      while (index < lines.length && !isBareFence(lines[index], continuation)) {
        output.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        output.push(lines[index]);
        index += 1;
      }
      continue;
    }

    // `$$` immediately followed by more dollars is not a fence we understand.
    if (rest.startsWith('$')) {
      output.push(line);
      index += 1;
      continue;
    }

    const singleLine = rest.match(CLOSING_SUFFIX_REGEX);

    if (singleLine) {
      const content = singleLine[1];
      if (content.trim() === '') {
        output.push(line);
        index += 1;
        continue;
      }
      output.push(`${prefix}$$`, `${continuation}${content.trim()}`, `${continuation}$$`);
      index += 1;
      continue;
    }

    // Multi-line block that opens with content: look for the closing fence,
    // either at the end of a later content line or as a bare `$$` line.
    let closingIndex = -1;
    let closingContent: string | null = null;

    for (let lookahead = index + 1; lookahead < lines.length; lookahead += 1) {
      const candidate = lines[lookahead];

      if (isBareFence(candidate, continuation)) {
        closingIndex = lookahead;
        break;
      }

      const trailing = candidate.match(CLOSING_SUFFIX_REGEX);
      if (trailing) {
        closingIndex = lookahead;
        closingContent = trailing[1];
        break;
      }
    }

    if (closingIndex === -1) {
      output.push(line);
      index += 1;
      continue;
    }

    output.push(`${prefix}$$`, `${continuation}${rest.trim()}`);
    for (let inner = index + 1; inner < closingIndex; inner += 1) {
      output.push(lines[inner]);
    }
    if (closingContent !== null) {
      output.push(closingContent.trimEnd());
    }
    output.push(`${continuation}$$`);
    index = closingIndex + 1;
  }

  return output.join(newline);
};
