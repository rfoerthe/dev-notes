import { StrictMode, useEffect, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const mermaidMock = vi.hoisted(() => ({
  currentDarkMode: false,
  currentTheme: 'neutral',
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock('mermaid', () => ({
  default: mermaidMock,
}));

import { renderInlineMarkdown, renderMarkdown } from '../components/markdownParser';
import { extractMarkdownHeadings } from '../components/markdownHeadings';
import { TableOfContents } from '../components/TableOfContents';

describe('Markdown renderer', () => {
  beforeEach(() => {
    mermaidMock.currentDarkMode = false;
    mermaidMock.currentTheme = 'neutral';
    mermaidMock.initialize.mockClear();
    mermaidMock.initialize.mockImplementation((config?: { darkMode?: boolean; theme?: string }) => {
      mermaidMock.currentDarkMode = Boolean(config?.darkMode);
      mermaidMock.currentTheme = config?.theme ?? 'neutral';
    });
    mermaidMock.render.mockReset();
    mermaidMock.render.mockImplementation((id: string) => Promise.resolve({
      svg: `<svg data-dark-mode="${mermaidMock.currentDarkMode}" data-render-id="${id}" data-testid="rendered-mermaid-svg" data-theme="${mermaidMock.currentTheme}" viewBox="0 0 100 40"><text>A</text></svg>`,
    }));
  });

  it('renders inline markdown for compact title and teaser text', () => {
    const { container } = render(<>{renderInlineMarkdown('Ein **starker** Teaser mit `code`.')}</>);

    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('starker');
    expect(container.querySelector('code')?.textContent).toBe('code');
  });

  it('can render inline markdown links as inert text for clickable cards', () => {
    const { container } = render(<>{renderInlineMarkdown('Mehr zu [React](https://react.dev)', true)}</>);

    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toBe('Mehr zu React');
  });

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
    const originalScrollTo = window.scrollTo;
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo });
    window.history.pushState(null, '', '/');

    try {
      const markdown = [
        '- [Installation](#installation)',
        '',
        '## Installation',
      ].join('\n');

      render(<>{renderMarkdown(markdown)}</>);

      fireEvent.click(screen.getByRole('link', { name: 'Installation' }));

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      expect(window.location.hash).toBe('#installation');
    } finally {
      Object.defineProperty(window, 'scrollTo', { configurable: true, value: originalScrollTo });
      window.history.pushState(null, '', '/');
    }
  });

  it('keeps umlauts in heading ids so encoded hash links can target them', () => {
    const originalScrollTo = window.scrollTo;
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo });
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

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      expect(window.location.hash).toBe('#schneller-%C3%BCberblick');
    } finally {
      Object.defineProperty(window, 'scrollTo', { configurable: true, value: originalScrollTo });
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
    const originalScrollTo = window.scrollTo;
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo });
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
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      expect(window.location.hash).toBe('#%C3%BCberblick');
    } finally {
      Object.defineProperty(window, 'scrollTo', { configurable: true, value: originalScrollTo });
      window.history.pushState(null, '', '/');
    }
  });

  it('moves the automatic table-of-contents marker to the current scrolled section', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
    const headingPositions: Record<string, number> = {
      'überblick': 200,
      details: 900,
      fazit: 1600,
    };

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      const documentTop = headingPositions[this.id] ?? 0;

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: documentTop - window.scrollY,
        width: 0,
        x: 0,
        y: documentTop - window.scrollY,
        toJSON: () => ({}),
      };
    };
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    window.history.pushState(null, '', '/');

    try {
      const markdown = '## Überblick\n\n### Details\n\n## Fazit';
      const headings = extractMarkdownHeadings(markdown);

      render(
        <>
          <h2 id="überblick">Überblick</h2>
          <h3 id="details">Details</h3>
          <h2 id="fazit">Fazit</h2>
          <TableOfContents headings={headings} />
        </>,
      );

      Object.defineProperty(window, 'scrollY', { configurable: true, value: 850 });
      fireEvent.scroll(window);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Details' }).getAttribute('aria-current')).toBe('location');
      });
      expect(screen.getByRole('link', { name: 'Überblick' }).getAttribute('aria-current')).toBeNull();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      if (originalScrollY) {
        Object.defineProperty(window, 'scrollY', originalScrollY);
      }
      window.history.pushState(null, '', '/');
    }
  });

  it('scrolls the table of contents to keep the active marker visible', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
    const headingPositions: Record<string, number> = {
      'überblick': 200,
      details: 900,
      fazit: 1600,
    };

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.getAttribute('aria-label') === 'Inhaltsverzeichnis') {
        return {
          bottom: 300,
          height: 200,
          left: 0,
          right: 240,
          top: 100,
          width: 240,
          x: 0,
          y: 100,
          toJSON: () => ({}),
        };
      }

      if (this.tagName === 'A' && this.textContent?.trim() === 'Details') {
        return {
          bottom: 390,
          height: 30,
          left: 0,
          right: 220,
          top: 360,
          width: 220,
          x: 0,
          y: 360,
          toJSON: () => ({}),
        };
      }

      const documentTop = headingPositions[this.id] ?? 0;

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: documentTop - window.scrollY,
        width: 0,
        x: 0,
        y: documentTop - window.scrollY,
        toJSON: () => ({}),
      };
    };
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    window.history.pushState(null, '', '/');

    try {
      const markdown = '## Überblick\n\n### Details\n\n## Fazit';
      const headings = extractMarkdownHeadings(markdown);

      render(
        <>
          <h2 id="überblick">Überblick</h2>
          <h3 id="details">Details</h3>
          <h2 id="fazit">Fazit</h2>
          <TableOfContents headings={headings} />
        </>,
      );

      const tableOfContents = screen.getByRole('navigation', { name: 'Inhaltsverzeichnis' });
      Object.defineProperty(tableOfContents, 'clientHeight', { configurable: true, value: 200 });
      Object.defineProperty(tableOfContents, 'scrollHeight', { configurable: true, value: 1000 });
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 850 });
      fireEvent.scroll(window);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Details' }).getAttribute('aria-current')).toBe('location');
        expect(tableOfContents.scrollTop).toBeGreaterThan(0);
      });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      if (originalScrollY) {
        Object.defineProperty(window, 'scrollY', originalScrollY);
      }
      window.history.pushState(null, '', '/');
    }
  });

  it('keeps the clicked table-of-contents marker active while smooth scrolling is in progress', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
    const originalScrollTo = window.scrollTo;
    const scrollTo = vi.fn();
    const headingPositions: Record<string, number> = {
      'überblick': 200,
      details: 900,
      fazit: 1600,
    };

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      const documentTop = headingPositions[this.id] ?? 0;

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: documentTop - window.scrollY,
        width: 0,
        x: 0,
        y: documentTop - window.scrollY,
        toJSON: () => ({}),
      };
    };
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    window.history.pushState(null, '', '/');

    try {
      const markdown = '## Überblick\n\n### Details\n\n## Fazit';
      const headings = extractMarkdownHeadings(markdown);
      const { unmount } = render(
        <>
          <h2 id="überblick">Überblick</h2>
          <h3 id="details">Details</h3>
          <h2 id="fazit">Fazit</h2>
          <TableOfContents headings={headings} />
        </>,
      );

      fireEvent.click(screen.getByRole('link', { name: 'Fazit' }));
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 850 });
      fireEvent.scroll(window);
      await new Promise((resolve) => window.setTimeout(resolve, 50));

      expect(scrollTo).toHaveBeenCalledWith({ top: 1510, behavior: 'smooth' });
      expect(screen.getByRole('link', { name: 'Fazit' }).getAttribute('aria-current')).toBe('location');
      expect(screen.getByRole('link', { name: 'Details' }).getAttribute('aria-current')).toBeNull();
      unmount();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      Object.defineProperty(window, 'scrollTo', { configurable: true, value: originalScrollTo });
      if (originalScrollY) {
        Object.defineProperty(window, 'scrollY', originalScrollY);
      }
      window.history.pushState(null, '', '/');
    }
  });

  it('keeps the table-of-contents marker aligned when rendered headings are replaced', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
    const headingPositions: Record<string, number> = {
      'überblick': 200,
      details: 900,
      fazit: 1600,
    };
    const markdown = '## Überblick\n\n### Details\n\n## Fazit';
    const headings = extractMarkdownHeadings(markdown);

    const RemountedHeadings = () => {
      const [version, setVersion] = useState(0);

      useEffect(() => {
        setVersion(1);
      }, []);

      return (
        <>
          <div key={version}>
            <h2 id="überblick">Überblick</h2>
            <h3 id="details">Details</h3>
            <h2 id="fazit">Fazit</h2>
          </div>
          <TableOfContents headings={headings} />
        </>
      );
    };

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      const documentTop = this.isConnected ? headingPositions[this.id] ?? 0 : 0;

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: documentTop - window.scrollY,
        width: 0,
        x: 0,
        y: documentTop - window.scrollY,
        toJSON: () => ({}),
      };
    };
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 850 });
    window.history.pushState(null, '', '/');

    try {
      render(<RemountedHeadings />);
      fireEvent.scroll(window);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Details' }).getAttribute('aria-current')).toBe('location');
      });
      expect(screen.getByRole('link', { name: 'Fazit' }).getAttribute('aria-current')).toBeNull();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      if (originalScrollY) {
        Object.defineProperty(window, 'scrollY', originalScrollY);
      }
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

  it('renders Mermaid fenced code blocks with Mermaid instead of Shiki', async () => {
    const markdown = '```mermaid\nflowchart LR\n  A --> B\n```';
    const { container } = render(<>{renderMarkdown(markdown)}</>);

    await waitFor(() => {
      expect(mermaidMock.render).toHaveBeenCalledWith(
        expect.stringMatching(/^mermaid-/),
        'flowchart LR\n  A --> B',
      );
    });

    expect(container.querySelector('[data-testid="mermaid-diagram"] svg')).toBeTruthy();
    expect(container.querySelector('code.language-mermaid')).toBeNull();
    expect(container.querySelector('[data-testid="mermaid-diagram"]')?.textContent).not.toContain('Mermaid');
    expect(screen.getByRole('button', { name: 'Mermaid-Diagramm als SVG herunterladen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mermaid-Diagramm vergrößern' })).toBeTruthy();
    expect(container.querySelector('.mermaid-zoom-overlay')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Code kopieren' })).toBeNull();
  });

  it('opens rendered Mermaid diagrams in a zoom dialog', async () => {
    const markdown = '```mermaid\nflowchart LR\n  A --> B\n```';
    render(<>{renderMarkdown(markdown)}</>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mermaid-Diagramm vergrößern' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mermaid-Diagramm vergrößern' }));

    expect(screen.getByRole('dialog', { name: 'Mermaid-Diagramm vergrößert' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mermaid-Diagramm herauszoomen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mermaid-Diagramm hineinzoomen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mermaid-Diagramm formatfüllend anzeigen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vergrößertes Mermaid-Diagramm schließen' })).toBeTruthy();
    expect(screen.queryByLabelText('Mermaid-Diagramm Zoomlevel')).toBeNull();
  });

  it('zooms Mermaid popup diagrams smoothly around the pointer and resets them to fit view', async () => {
    const markdown = '```mermaid\nflowchart LR\n  A --> B\n```';
    render(<>{renderMarkdown(markdown)}</>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mermaid-Diagramm vergrößern' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mermaid-Diagramm vergrößern' }));

    const zoomArea = screen.getByLabelText('Mermaid-Diagramm Zoom-Bereich');
    const zoomContent = screen.getByTestId('mermaid-zoom-content');
    const zoomSvg = zoomContent.querySelector('svg');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    const hasPointerCapture = vi.fn(() => true);
    Object.defineProperty(zoomArea, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });
    Object.defineProperty(zoomArea, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCapture,
    });
    Object.defineProperty(zoomArea, 'hasPointerCapture', {
      configurable: true,
      value: hasPointerCapture,
    });
    const zoomAreaCursor = window.getComputedStyle(zoomArea).cursor;
    expect(zoomAreaCursor).toContain('data:image/svg+xml');
    expect(zoomAreaCursor).toContain('ns-resize');
    expect(zoomAreaCursor).not.toBe('zoom-in');
    vi.spyOn(zoomArea, 'getBoundingClientRect').mockReturnValue({
      bottom: 520,
      height: 500,
      left: 10,
      right: 1010,
      toJSON: () => undefined,
      top: 20,
      width: 1000,
      x: 10,
      y: 20,
    });
    const zoomOutButton = screen.getByRole('button', { name: 'Mermaid-Diagramm herauszoomen' });
    const zoomInButton = screen.getByRole('button', { name: 'Mermaid-Diagramm hineinzoomen' });
    expect(zoomContent.getAttribute('data-zoom-scale')).toBe('1.00');
    expect(zoomContent.getAttribute('data-zoom-x')).toBe('0.000');
    expect(zoomContent.getAttribute('data-zoom-y')).toBe('0.000');
    expect(window.getComputedStyle(zoomArea).overflowY).toBe('hidden');
    expect(window.getComputedStyle(zoomArea).overflowX).toBe('hidden');
    expect(screen.queryByLabelText('Mermaid-Diagramm Zoomlevel')).toBeNull();

    fireEvent.click(zoomOutButton);
    await waitFor(() => {
      expect(zoomContent.getAttribute('data-zoom-scale')).toBe('0.90');
      expect(screen.getByLabelText('Mermaid-Diagramm Zoomlevel').textContent).toBe('90%');
    });

    fireEvent.click(zoomInButton);
    await waitFor(() => {
      expect(zoomContent.getAttribute('data-zoom-scale')).toBe('1.00');
      expect(screen.queryByLabelText('Mermaid-Diagramm Zoomlevel')).toBeNull();
    });

    for (let index = 0; index < 9; index += 1) {
      fireEvent.click(zoomOutButton);
    }
    await waitFor(() => {
      expect(zoomContent.getAttribute('data-zoom-scale')).toBe('0.10');
      expect(screen.getByLabelText('Mermaid-Diagramm Zoomlevel').textContent).toBe('10%');
      expect((zoomOutButton as HTMLButtonElement).disabled).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mermaid-Diagramm formatfüllend anzeigen' }));
    expect(zoomContent.getAttribute('data-zoom-scale')).toBe('1.00');
    expect(zoomContent.getAttribute('data-zoom-x')).toBe('0.000');
    expect(zoomContent.getAttribute('data-zoom-y')).toBe('0.000');
    expect(screen.queryByLabelText('Mermaid-Diagramm Zoomlevel')).toBeNull();

    const zeroDeltaWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 210,
      clientY: 120,
      deltaY: 0,
    });
    fireEvent(zoomArea, zeroDeltaWheel);
    expect(zoomContent.getAttribute('data-zoom-scale')).toBe('1.00');

    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame');
    for (let index = 0; index < 12; index += 1) {
      fireEvent.wheel(zoomArea, { clientX: 210, clientY: 120, deltaY: -2 });
    }
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    requestAnimationFrameSpy.mockRestore();
    await waitFor(() => {
      expect(zoomContent.getAttribute('data-zoom-scale')).toBe('1.04');
    });

    const burstScale = Number(zoomContent.style.transform.match(/scale\(([^)]+)\)/)?.[1]);
    const burstX = Number(zoomContent.getAttribute('data-zoom-x'));
    const burstY = Number(zoomContent.getAttribute('data-zoom-y'));
    const pointerX = 210 - 10;
    const pointerY = 120 - 20;
    expect(burstX + (pointerX * burstScale)).toBeCloseTo(pointerX, 1);
    expect(burstY + (pointerY * burstScale)).toBeCloseTo(pointerY, 1);

    fireEvent.click(screen.getByRole('button', { name: 'Mermaid-Diagramm formatfüllend anzeigen' }));

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 210,
      clientY: 120,
      deltaY: -120,
    });
    fireEvent(zoomArea, wheelEvent);
    expect(wheelEvent.defaultPrevented).toBe(true);

    await waitFor(() => {
      expect(zoomContent.getAttribute('data-zoom-scale')).toBe('1.20');
      expect(screen.getByLabelText('Mermaid-Diagramm Zoomlevel').textContent).toBe('120%');
    });
    expect(window.getComputedStyle(zoomArea).overflowY).toBe('auto');
    expect(window.getComputedStyle(zoomArea).overflowX).toBe('auto');
    const zoomLevel = screen.getByLabelText('Mermaid-Diagramm Zoomlevel');
    const headerItems = Array.from(zoomLevel.parentElement?.children ?? []);
    expect(zoomLevel.textContent).toBe('120%');
    expect(headerItems.indexOf(zoomLevel)).toBeLessThan(headerItems.indexOf(zoomOutButton.parentElement as Element));
    expect(headerItems.indexOf(zoomLevel)).toBeLessThan(headerItems.indexOf(zoomInButton.parentElement as Element));
    expect(zoomContent.querySelector('svg')).toBe(zoomSvg);

    const anchoredScale = Number(zoomContent.style.transform.match(/scale\(([^)]+)\)/)?.[1]);
    const anchoredX = Number(zoomContent.getAttribute('data-zoom-x'));
    const anchoredY = Number(zoomContent.getAttribute('data-zoom-y'));
    expect(anchoredX + (pointerX * anchoredScale)).toBeCloseTo(pointerX, 1);
    expect(anchoredY + (pointerY * anchoredScale)).toBeCloseTo(pointerY, 1);

    fireEvent.click(screen.getByRole('button', { name: 'Mermaid-Diagramm hineinzoomen' }));
    await waitFor(() => {
      expect(zoomContent.getAttribute('data-zoom-scale')).toBe('1.30');
      expect(screen.getByLabelText('Mermaid-Diagramm Zoomlevel').textContent).toBe('130%');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mermaid-Diagramm herauszoomen' }));
    await waitFor(() => {
      expect(zoomContent.getAttribute('data-zoom-scale')).toBe('1.20');
      expect(screen.getByLabelText('Mermaid-Diagramm Zoomlevel').textContent).toBe('120%');
    });

    const panStartX = Number(zoomContent.getAttribute('data-zoom-x'));
    const panStartY = Number(zoomContent.getAttribute('data-zoom-y'));

    fireEvent.pointerDown(zoomArea, { button: 0, clientX: 300, clientY: 220, pointerId: 7 });
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    const panCursor = window.getComputedStyle(zoomArea).cursor;
    expect(panCursor).toContain('data:image/svg+xml');
    expect(panCursor).toContain('grabbing');

    fireEvent.pointerMove(zoomArea, { clientX: 250, clientY: 180, pointerId: 7 });
    expect(Number(zoomContent.getAttribute('data-zoom-x'))).toBeCloseTo(panStartX - 50);
    expect(Number(zoomContent.getAttribute('data-zoom-y'))).toBeCloseTo(panStartY - 40);

    fireEvent.pointerUp(zoomArea, { pointerId: 7 });
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
    const releasedCursor = window.getComputedStyle(zoomArea).cursor;
    expect(releasedCursor).toContain('data:image/svg+xml');
    expect(releasedCursor).toContain('ns-resize');

    fireEvent.click(screen.getByRole('button', { name: 'Mermaid-Diagramm formatfüllend anzeigen' }));
    expect(zoomContent.getAttribute('data-zoom-scale')).toBe('1.00');
    expect(zoomContent.getAttribute('data-zoom-x')).toBe('0.000');
    expect(zoomContent.getAttribute('data-zoom-y')).toBe('0.000');
    expect(window.getComputedStyle(zoomArea).overflowY).toBe('hidden');
    expect(window.getComputedStyle(zoomArea).overflowX).toBe('hidden');
    expect(screen.queryByLabelText('Mermaid-Diagramm Zoomlevel')).toBeNull();
  });

  it('downloads rendered Mermaid diagrams as light themed SVG files', async () => {
    const createObjectURL = vi.fn((file: Blob | MediaSource) => {
      void file;
      return 'blob:mermaid-diagram';
    });
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    try {
      const darkTheme = createTheme({ palette: { mode: 'dark' } });
      const markdown = '```mermaid\nflowchart LR\n  A --> B\n```';
      const { container } = render(
        <ThemeProvider theme={darkTheme}>
          {renderMarkdown(markdown)}
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Mermaid-Diagramm als SVG herunterladen' })).toBeTruthy();
      });
      expect(container.querySelector('svg[data-testid="rendered-mermaid-svg"]')?.getAttribute('data-theme')).toBe('dark');
      expect(container.querySelector('svg[data-testid="rendered-mermaid-svg"]')?.getAttribute('data-dark-mode')).toBe('true');

      fireEvent.click(screen.getByRole('button', { name: 'Mermaid-Diagramm als SVG herunterladen' }));

      await waitFor(() => {
        expect(click).toHaveBeenCalled();
        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      });
      const svgBlob = createObjectURL.mock.calls[0][0] as Blob;
      expect(svgBlob.type).toBe('image/svg+xml;charset=utf-8');
      await expect(svgBlob.text()).resolves.toContain('<svg');
      await expect(svgBlob.text()).resolves.toContain('data-theme="neutral"');
      await expect(svgBlob.text()).resolves.toContain('data-dark-mode="false"');
      await expect(svgBlob.text()).resolves.toContain('-export-light');
    } finally {
      click.mockRestore();
    }
  });

  it('does not render Mermaid diagrams again when the parent rerenders unchanged markdown', async () => {
    const markdown = '```mermaid\nflowchart LR\n  Cached --> Stable\n```';
    const MarkdownView = ({ tick }: { tick: number }) => (
      <div data-tick={tick}>{renderMarkdown(markdown)}</div>
    );

    const { rerender } = render(<MarkdownView tick={0} />);

    await waitFor(() => {
      expect(mermaidMock.render).toHaveBeenCalledTimes(1);
    });

    rerender(<MarkdownView tick={1} />);
    await new Promise((resolve) => window.setTimeout(resolve, 50));

    expect(mermaidMock.render).toHaveBeenCalledTimes(1);
  });

  it('shows a compact fallback when Mermaid rendering fails', async () => {
    mermaidMock.render.mockRejectedValueOnce(new Error('Unknown diagram type'));
    const markdown = '```mermaid\nnot a diagram\n```';
    const { container } = render(<>{renderMarkdown(markdown)}</>);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Mermaid-Diagramm konnte nicht gerendert werden.');
    });

    expect(screen.getByRole('alert').textContent).toContain('Unknown diagram type');
    expect(container.querySelector('code.language-mermaid')?.textContent).toContain('not a diagram');
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
