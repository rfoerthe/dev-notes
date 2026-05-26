import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderMarkdown } from '../components/markdownParser';

describe('Markdown renderer', () => {
  it('renders inline markdown formatting', () => {
    const { container } = render(<>{renderMarkdown('Das ist **fett** und *kursiv* mit `code`.')}</>);

    expect(container.querySelector('strong')?.textContent).toBe('fett');
    expect(container.querySelector('em')?.textContent).toBe('kursiv');
    expect(container.querySelector('code')?.textContent).toBe('code');
  });

  it('renders list items containing formatted text', () => {
    const markdown = '* Ein **fettes** Wort\n* Ein *kursives* Wort';
    const { container } = render(<>{renderMarkdown(markdown)}</>);

    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(2);
    expect(listItems[0].querySelector('strong')?.textContent).toBe('fettes');
    expect(listItems[1].querySelector('em')?.textContent).toBe('kursives');
  });

  it('renders GitHub-flavored markdown tables', () => {
    const markdown = [
      '| Metrik / Projekt | Alter `tsc` (JS-basiert) | Neuer `tsgo` (Go-basiert) | Beschleunigung |',
      '| --- | --- | --- | --- |',
      '| **VS Code Build** (1.5M LoC) | 77,8 s | 7,5 s | **10,2x schneller** |',
      '| **Sentry** (800k LoC) | 45,2 s | 5,1 s | **8,9x schneller** |',
    ].join('\n');

    const { container } = render(<>{renderMarkdown(markdown)}</>);

    const table = container.querySelector('table');
    const headers = container.querySelectorAll('th');
    const rows = container.querySelectorAll('tbody tr');

    expect(table).toBeTruthy();
    expect(headers.length).toBe(4);
    expect(rows.length).toBe(2);
    expect(headers[1].textContent).toBe('Alter tsc (JS-basiert)');
    expect(rows[0].querySelector('strong')?.textContent).toBe('VS Code Build');
    expect(rows[0].querySelectorAll('strong')[1]?.textContent).toBe('10,2x schneller');
  });

  it('preserves GitHub table alignment markers', () => {
    const markdown = [
      '| Left | Center | Right |',
      '| :--- | :---: | ---: |',
      '| a | b | c |',
    ].join('\n');

    const { container } = render(<>{renderMarkdown(markdown)}</>);
    const headers = container.querySelectorAll('th');

    expect(headers[0].getAttribute('style')).toContain('text-align: left');
    expect(headers[1].getAttribute('style')).toContain('text-align: center');
    expect(headers[2].getAttribute('style')).toContain('text-align: right');
  });

  it('renders GitHub-flavored task lists', () => {
    const markdown = '- [x] erledigt\n- [ ] offen';
    const { container } = render(<>{renderMarkdown(markdown)}</>);

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it('highlights fenced code blocks with Shiki', async () => {
    const markdown = '```python\nfrom mlx_lm import load, generate\n# comment here\n```';
    const { container } = render(<>{renderMarkdown(markdown)}</>);

    await waitFor(() => {
      const token = Array.from(container.querySelectorAll('pre code span')).find((span) => span.textContent === 'from');
      expect(token).toBeTruthy();
      expect(token?.getAttribute('style')).toContain('color:');
    });

    expect(container.querySelector('code.language-python')?.textContent).toContain('# comment here');
  });

  it('copies fenced code blocks to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const markdown = '```typescript\nconst answer = 42;\n```';
    render(<>{renderMarkdown(markdown)}</>);

    fireEvent.click(screen.getByRole('button', { name: 'Code kopieren' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('const answer = 42;');
    });
    expect(screen.getByRole('button', { name: 'Code kopiert' })).toBeTruthy();
  });
});
