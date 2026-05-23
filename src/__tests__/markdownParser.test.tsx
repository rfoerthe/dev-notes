import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { parseInlineStyles, renderMarkdown } from '../components/markdownParser';

describe('Markdown Parser Inline Styling & Rich Blocks', () => {
  it('should parse double asterisks as bold', () => {
    const { container } = render(<>{parseInlineStyles('Das ist **fett gedruckter** Text.')}</>);
    const strongElement = container.querySelector('strong');
    expect(strongElement).toBeTruthy();
    expect(strongElement?.textContent).toBe('fett gedruckter');
  });

  it('should parse single asterisks as italics', () => {
    const { container } = render(<>{parseInlineStyles('Das ist *kursiver* Text.')}</>);
    const emElement = container.querySelector('em');
    expect(emElement).toBeTruthy();
    expect(emElement?.textContent).toBe('kursiver');
  });

  it('should parse nested italics inside bold', () => {
    const { container } = render(<>{parseInlineStyles('Dies ist **fett und *kursiv* fett**.')}</>);
    const strongElement = container.querySelector('strong');
    expect(strongElement).toBeTruthy();
    expect(strongElement?.textContent).toBe('fett und kursiv fett');

    const emElement = strongElement?.querySelector('em');
    expect(emElement).toBeTruthy();
    expect(emElement?.textContent).toBe('kursiv');
  });

  it('should handle multiple bold and italic elements in one string', () => {
    const { container } = render(<>{parseInlineStyles('Hier ist **fett** und *kursiv* und **nochmal fett**.')}</>);
    const strongElements = container.querySelectorAll('strong');
    const emElement = container.querySelector('em');

    expect(strongElements.length).toBe(2);
    expect(strongElements[0].textContent).toBe('fett');
    expect(strongElements[1].textContent).toBe('nochmal fett');
    expect(emElement).toBeTruthy();
    expect(emElement?.textContent).toBe('kursiv');
  });

  it('should correctly ignore isolated single asterisks (e.g. math operations)', () => {
    const { container } = render(<>{parseInlineStyles('Berechnung: 5 * 5 = 25')}</>);
    const emElement = container.querySelector('em');
    expect(emElement).toBeNull();
    expect(container.textContent).toBe('Berechnung: 5 * 5 = 25');
  });

  it('should handle incomplete double asterisks gracefully', () => {
    const { container } = render(<>{parseInlineStyles('Dies ist **unvollständig')}</>);
    const strongElement = container.querySelector('strong');
    expect(strongElement).toBeNull();
    expect(container.textContent).toBe('Dies ist **unvollständig');
  });

  it('should parse list items containing bold and italics', () => {
    const markdown = '* Ein **fettes** Wort\n* Ein *kursives* Wort';
    const elements = renderMarkdown(markdown);
    
    // Render the React elements
    const { container } = render(<>{elements}</>);
    
    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(2);
    
    const strong = listItems[0].querySelector('strong');
    expect(strong).toBeTruthy();
    expect(strong?.textContent).toBe('fettes');
    
    const em = listItems[1].querySelector('em');
    expect(em).toBeTruthy();
    expect(em?.textContent).toBe('kursives');
  });

  it('should colorize Python syntax highlighting tokens', () => {
    const markdown = '```python\nfrom mlx_lm import load, generate\n# comment here\n```';
    const elements = renderMarkdown(markdown);
    const { container } = render(<>{elements}</>);

    // Find spans with keyword classes or colors
    const spans = Array.from(container.querySelectorAll('span'));
    const keywordFrom = spans.find(s => s.textContent === 'from');
    const keywordImport = spans.find(s => s.textContent === 'import');
    const comment = spans.find(s => s.textContent === '# comment here');

    expect(keywordFrom).toBeTruthy();
    expect(keywordImport).toBeTruthy();
    expect(comment).toBeTruthy();

    // Purple color (#c084fc) in rgb is rgb(192, 132, 252)
    expect(keywordFrom?.getAttribute('style')).toContain('color: rgb(192, 132, 252)');
    // Slate gray color (#64748b) in rgb is rgb(100, 116, 139)
    expect(comment?.getAttribute('style')).toContain('color: rgb(100, 116, 139)');
  });

  it('should colorize Bash commands and arguments', () => {
    const markdown = '```bash\npip install mlx-lm\n```';
    const elements = renderMarkdown(markdown);
    const { container } = render(<>{elements}</>);

    const spans = Array.from(container.querySelectorAll('span'));
    const commandPip = spans.find(s => s.textContent === 'pip');
    const actionInstall = spans.find(s => s.textContent === 'install');

    expect(commandPip).toBeTruthy();
    expect(actionInstall).toBeTruthy();

    expect(commandPip?.getAttribute('style')).toContain('color: rgb(192, 132, 252)');
    expect(actionInstall?.getAttribute('style')).toContain('color: rgb(192, 132, 252)');
  });
});
