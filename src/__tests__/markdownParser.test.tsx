import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderMarkdown } from '../components/markdownParser';
import { extractMarkdownHeadings } from '../components/markdownHeadings';
import { TableOfContents } from '../components/TableOfContents';

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
    const cells = container.querySelectorAll('td');

    expect(headers[0].getAttribute('style')).toContain('text-align: left');
    expect(headers[1].getAttribute('style')).toContain('text-align: center');
    expect(headers[2].getAttribute('style')).toContain('text-align: right');
    expect(cells[0].getAttribute('style')).toContain('text-align: left');
    expect(cells[1].getAttribute('style')).toContain('text-align: center');
    expect(cells[2].getAttribute('style')).toContain('text-align: right');
  });

  it('renders GitHub-flavored task lists', () => {
    const markdown = '- [x] erledigt\n- [ ] offen';
    const { container } = render(<>{renderMarkdown(markdown)}</>);

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it('adds linkable ids to headings for table-of-contents anchors', () => {
    const markdown = [
      '## Inhaltsverzeichnis',
      '',
      '- [Warum Rust so gut zu CLI-Tools passt](#warum-rust-so-gut-zu-cli-tools-passt)',
      '- [Installation](#installation)',
      '',
      '## Warum Rust so gut zu CLI-Tools passt',
      '',
      '## Installation',
    ].join('\n');

    const { container } = render(<>{renderMarkdown(markdown)}</>);

    expect(container.querySelector('#warum-rust-so-gut-zu-cli-tools-passt')?.textContent).toBe('Warum Rust so gut zu CLI-Tools passt');
    expect(container.querySelector('#installation')?.textContent).toBe('Installation');
    expect(container.querySelector('a[href="#warum-rust-so-gut-zu-cli-tools-passt"]')?.textContent).toBe('Warum Rust so gut zu CLI-Tools passt');
  });

  it('splits camel case heading ids so table-of-contents anchors can target them', () => {
    const markdown = [
      '- [ScopedElementsMixin im Detail](#scoped-elements-mixin-im-detail)',
      '',
      '## ScopedElementsMixin im Detail',
    ].join('\n');

    const { container } = render(<>{renderMarkdown(markdown)}</>);

    expect(container.querySelector('#scoped-elements-mixin-im-detail')?.textContent).toBe('ScopedElementsMixin im Detail');
    expect(container.querySelector('a[href="#scoped-elements-mixin-im-detail"]')?.textContent).toBe('ScopedElementsMixin im Detail');
  });

  it('scrolls to a heading when a table-of-contents anchor is clicked', () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    window.history.pushState(null, '', '/');

    try {
      const markdown = [
        '- [Installation](#installation)',
        '',
        '## Installation',
      ].join('\n');

      render(<>{renderMarkdown(markdown)}</>);

      fireEvent.click(screen.getByRole('link', { name: 'Installation' }));

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(window.location.hash).toBe('#installation');
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      window.history.pushState(null, '', '/');
    }
  });

  it('keeps umlauts in heading ids so encoded hash links can target them', () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    window.history.pushState(null, '', '/');

    try {
      const markdown = [
        '- [Schneller Überblick](#schneller-%C3%BCberblick)',
        '',
        '## Schneller Überblick',
      ].join('\n');

      const { container } = render(<>{renderMarkdown(markdown)}</>);

      expect(container.querySelector('[id="schneller-überblick"]')?.textContent).toBe('Schneller Überblick');

      fireEvent.click(screen.getByRole('link', { name: 'Schneller Überblick' }));

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(window.location.hash).toBe('#schneller-%C3%BCberblick');
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      window.history.pushState(null, '', '/');
    }
  });

  it('keeps duplicate heading ids unique', () => {
    const markdown = '## Installation\n\n## Installation';
    const { container } = render(<>{renderMarkdown(markdown)}</>);

    expect(container.querySelector('#installation')?.textContent).toBe('Installation');
    expect(container.querySelector('#installation-1')?.textContent).toBe('Installation');
  });

  it('keeps heading ids stable in React StrictMode', () => {
    const markdown = '## Installation';
    const { container } = render(<StrictMode>{renderMarkdown(markdown)}</StrictMode>);

    expect(container.querySelector('#installation')?.textContent).toBe('Installation');
    expect(container.querySelector('#installation-1')).toBeNull();
  });

  it('extracts table-of-contents entries with the same ids as rendered headings', () => {
    const markdown = [
      '## Einführung',
      '',
      '### ScopedElementsMixin im Detail',
      '',
      '## Einführung',
    ].join('\n');

    const { container } = render(<>{renderMarkdown(markdown)}</>);
    const headings = extractMarkdownHeadings(markdown);

    expect(headings).toEqual([
      { id: 'einführung', level: 2, line: 1, text: 'Einführung' },
      { id: 'scoped-elements-mixin-im-detail', level: 3, line: 3, text: 'ScopedElementsMixin im Detail' },
      { id: 'einführung-1', level: 2, line: 5, text: 'Einführung' },
    ]);
    headings.forEach((heading) => {
      expect(container.querySelector(`[id="${heading.id}"]`)?.textContent).toBe(heading.text);
    });
  });

  it('ignores markdown headings inside fenced code blocks when extracting table-of-contents entries', () => {
    const markdown = [
      '## Sichtbar',
      '',
      '```md',
      '## Nicht sichtbar',
      '```',
      '',
      '### Auch sichtbar',
    ].join('\n');

    expect(extractMarkdownHeadings(markdown).map((heading) => heading.text)).toEqual([
      'Sichtbar',
      'Auch sichtbar',
    ]);
  });

  it('supports setext headings in rendered ids and table-of-contents extraction', () => {
    const markdown = [
      'Überblick',
      '=========',
      '',
      'Details',
      '-------',
    ].join('\n');

    const { container } = render(<>{renderMarkdown(markdown)}</>);
    const headings = extractMarkdownHeadings(markdown);

    expect(headings).toEqual([
      { id: 'überblick', level: 1, line: 1, text: 'Überblick' },
      { id: 'details', level: 2, line: 4, text: 'Details' },
    ]);
    expect(container.querySelector('[id="überblick"]')?.textContent).toBe('Überblick');
    expect(container.querySelector('#details')?.textContent).toBe('Details');
  });

  it('renders automatic table-of-contents links that jump to matching headings', () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    window.history.pushState(null, '', '/');

    try {
      const markdown = '## Überblick\n\n### Details';
      const headings = extractMarkdownHeadings(markdown);

      render(
        <>
          <h2 id="überblick">Überblick</h2>
          <h3 id="details">Details</h3>
          <TableOfContents headings={headings} />
        </>,
      );

      fireEvent.click(screen.getByRole('link', { name: 'Überblick' }));

      expect(screen.getByRole('navigation', { name: 'Inhaltsverzeichnis' })).toBeTruthy();
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(window.location.hash).toBe('#%C3%BCberblick');
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      window.history.pushState(null, '', '/');
    }
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
