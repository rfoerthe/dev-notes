import { describe, expect, it } from 'vitest';

import { normalizeMathBlocks } from '../components/markdownMath';

describe('normalizeMathBlocks', () => {
  it('leaves markdown without display math untouched', () => {
    const markdown = '# Titel\n\nText mit $a^2$ und `code`.\n';

    expect(normalizeMathBlocks(markdown)).toBe(markdown);
  });

  it('leaves well-formed display math blocks untouched', () => {
    const markdown = 'Vorher\n\n$$\n\\sum_{i=1}^{n} i\n$$\n\nNachher';

    expect(normalizeMathBlocks(markdown)).toBe(markdown);
  });

  it('turns single-line $$…$$ paragraphs into display math blocks', () => {
    const markdown = 'Vorher\n\n$$E = mc^2$$\n\nNachher';

    expect(normalizeMathBlocks(markdown)).toBe('Vorher\n\n$$\nE = mc^2\n$$\n\nNachher');
  });

  it('moves the fences of multi-line $$content … content$$ blocks onto their own lines', () => {
    const markdown = [
      '### Brüche',
      '',
      '$$\\frac{a}{b}',
      '\\qquad',
      '\\sqrt{x}$$',
      '',
      '### Griechisch',
    ].join('\n');

    expect(normalizeMathBlocks(markdown)).toBe([
      '### Brüche',
      '',
      '$$',
      '\\frac{a}{b}',
      '\\qquad',
      '\\sqrt{x}',
      '$$',
      '',
      '### Griechisch',
    ].join('\n'));
  });

  it('handles an opening fence with content that is closed by a bare $$ line', () => {
    const markdown = '$$\\begin{aligned}\na &= b\n\\end{aligned}\n$$';

    expect(normalizeMathBlocks(markdown)).toBe('$$\n\\begin{aligned}\na &= b\n\\end{aligned}\n$$');
  });

  it('keeps the blockquote and list prefix on every line of the block', () => {
    expect(normalizeMathBlocks('> $$a\n> b$$')).toBe('> $$\n> a\n> b\n> $$');
    expect(normalizeMathBlocks('- Punkt\n- $$x^2$$')).toBe('- Punkt\n- $$\n  x^2\n  $$');
  });

  it('does not touch $$ inside fenced code blocks', () => {
    const markdown = '```markdown\n$$E = mc^2$$\n```\n\n~~~\n$$a\nb$$\n~~~';

    expect(normalizeMathBlocks(markdown)).toBe(markdown);
  });

  it('leaves inline $$…$$ inside running text alone', () => {
    const markdown = 'Die Formel $$E = mc^2$$ steht im Satz.';

    expect(normalizeMathBlocks(markdown)).toBe(markdown);
  });

  it('leaves an unclosed $$ block alone', () => {
    const markdown = '$$\\frac{a}{b}\nweiter\n\nText';

    expect(normalizeMathBlocks(markdown)).toBe(markdown);
  });

  it('does not treat a lone $$ pair on one line as a block', () => {
    expect(normalizeMathBlocks('$$$$')).toBe('$$$$');
  });

  it('preserves CRLF line endings', () => {
    expect(normalizeMathBlocks('a\r\n$$x$$\r\nb')).toBe('a\r\n$$\r\nx\r\n$$\r\nb');
  });
});
