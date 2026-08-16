import { afterEach, describe, expect, it } from 'vitest';
import {
  applyMermaidLabelContrast,
  applyMermaidLabelContrastToMarkup,
  getMermaidConfig,
  getReadableMermaidInk,
  withMermaidStyleOverrides,
} from '../components/mermaidTheme';

const DARK_INK = '#0f172a';
const LIGHT_INK = '#f1f5f9';
const DARK_INK_RGB = 'rgb(15, 23, 42)';
const LIGHT_INK_RGB = 'rgb(241, 245, 249)';

const createNodeSvg = (options: { fill?: string; labelColor?: string } = {}) => {
  const fillStyle = options.fill ? ` style="fill:${options.fill} !important"` : '';
  const labelStyle = options.labelColor ? ` style="color:${options.labelColor} !important"` : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg">
      <g class="node default" id="node-1">
        <rect class="basic label-container"${fillStyle}></rect>
        <g class="label"${labelStyle}>
          <foreignObject width="100" height="20">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <span class="nodeLabel"><p>Knoten <b>fett</b></p></span>
            </div>
          </foreignObject>
        </g>
      </g>
    </svg>
  `;
};

const renderSvg = (markup: string) => {
  const host = document.createElement('div');

  host.innerHTML = markup;
  document.body.appendChild(host);

  return host;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getMermaidConfig', () => {
  it('renders HTML labels so that <b> and <i> become real markup', () => {
    expect(getMermaidConfig('dark').htmlLabels).toBe(true);
    expect(getMermaidConfig('dark').flowchart?.htmlLabels).toBe(true);
    expect(getMermaidConfig('light').htmlLabels).toBe(true);
    expect(getMermaidConfig('light').flowchart?.htmlLabels).toBe(true);
  });

  it('keeps sanitizing diagram sources', () => {
    expect(getMermaidConfig('dark').securityLevel).toBe('strict');
    expect(getMermaidConfig('light').securityLevel).toBe('strict');
  });

  it('defines section colors for scale based diagrams in both modes', () => {
    const darkVariables = getMermaidConfig('dark').themeVariables ?? {};
    const lightVariables = getMermaidConfig('light').themeVariables ?? {};
    const scaleKeys = (variables: Record<string, unknown>, prefix: string) => Object.keys(variables)
      .filter((key) => new RegExp(`^${prefix}\\d+$`).test(key));

    [darkVariables, lightVariables].forEach((variables) => {
      expect(scaleKeys(variables, 'cScale')).toHaveLength(12);
      // Kanban and treemap paint their sections with the peer colors, which the base theme would
      // otherwise derive by an offset that pushes the brighter hues out of readable range.
      expect(scaleKeys(variables, 'cScalePeer')).toHaveLength(12);
    });

    expect(darkVariables.cScale0).not.toBe(lightVariables.cScale0);
    expect(darkVariables.cScale0).not.toBe(darkVariables.cScalePeer0);
  });

  it('uses explicit theme variables per color mode', () => {
    const darkConfig = getMermaidConfig('dark');
    const lightConfig = getMermaidConfig('light');

    expect(darkConfig.theme).toBe('base');
    expect(darkConfig.darkMode).toBe(true);
    expect(darkConfig.themeVariables?.background).toBe('#060913');
    expect(lightConfig.theme).toBe('base');
    expect(lightConfig.darkMode).toBe(false);
    expect(lightConfig.themeVariables?.background).toBe('#f8fafc');
    expect(darkConfig.themeVariables?.primaryColor).not.toBe(lightConfig.themeVariables?.primaryColor);
  });

  it('overrides the colors mermaid derives for the wrong color mode', () => {
    const darkVariables = getMermaidConfig('dark').themeVariables ?? {};
    const lightVariables = getMermaidConfig('light').themeVariables ?? {};

    // Mermaid only reads `darkMode` from the theme variables, so without these the ER attribute
    // rows and the gantt bars stay on their light defaults in dark mode.
    (['rowOdd', 'rowEven', 'taskBkgColor', 'doneTaskBkgColor', 'sectionBkgColor'] as const)
      .forEach((key) => {
        expect(getReadableMermaidInk(darkVariables[key] as string, 'dark')).toBe(LIGHT_INK);
        expect(getReadableMermaidInk(lightVariables[key] as string, 'light')).toBe(DARK_INK);
      });
  });

  it('gives every git branch a visible color and a matching label ink', () => {
    (['dark', 'light'] as const).forEach((mode) => {
      const variables = getMermaidConfig(mode).themeVariables ?? {};
      const surfaceInk = mode === 'dark' ? LIGHT_INK : DARK_INK;

      Array.from({ length: 8 }, (_, index) => index).forEach((index) => {
        const color = variables[`git${index}`] as string;

        // Not the near black the base theme derives for dark mode, and the branch name on top of
        // the branch color needs whichever ink reads on that color, not a fixed one.
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
        expect(getReadableMermaidInk(null, mode)).toBe(surfaceInk);
        expect(variables[`gitBranchLabel${index}`]).toBe(getReadableMermaidInk(color, mode));
        expect(variables[`gitInv${index}`]).toBe(surfaceInk);
      });
    });
  });

  it('gives the pie and xy charts a palette that works on their own surface', () => {
    (['dark', 'light'] as const).forEach((mode) => {
      const variables = getMermaidConfig(mode).themeVariables ?? {};
      const slices = Array.from({ length: 12 }, (_, i) => variables[`pie${i + 1}`] as string);

      expect(slices.every((color) => /^#[0-9a-f]{6}$/.test(color))).toBe(true);
      // One ink serves every slice, so the palette has to stay on one side of the readable range.
      slices.forEach((color) => {
        expect(getReadableMermaidInk(color, mode)).toBe(variables.pieSectionTextColor);
      });
      // Nested theme objects replace the derived ones instead of merging, so a missing key is
      // `undefined` for the renderer rather than a sensible default.
      const xyChart = variables.xyChart as Record<string, string>;
      expect(xyChart.backgroundColor).toBe(mode === 'dark' ? '#060913' : '#f8fafc');
      expect(xyChart.plotColorPalette.split(',')).toHaveLength(10);
      expect((variables.radar as Record<string, unknown>).axisColor).toBeDefined();
    });
  });

  it('gives the packet diagram readable bit numbers instead of the black default', () => {
    expect(getMermaidConfig('dark').themeVariables?.packet).toMatchObject({
      startByteColor: '#cbd5e1',
      titleColor: LIGHT_INK,
    });
    expect(getMermaidConfig('light').themeVariables?.packet).toMatchObject({
      startByteColor: '#334155',
      titleColor: DARK_INK,
    });
  });
});

describe('withMermaidStyleOverrides', () => {
  const render = (mode: 'dark' | 'light') => withMermaidStyleOverrides(
    '<svg id="mermaid-1"><text fill="#444444">Rand</text></svg>',
    'mermaid-1',
    mode,
  );

  it('recolors the label colors c4 hard-codes and scopes the rules to the diagram', () => {
    expect(render('dark')).toContain('#mermaid-1 text[fill="#444444"]{fill:#e2e8f0;');
    expect(render('light')).toContain('#mermaid-1 text[fill="#444444"]{fill:#334155;');
    expect(render('dark')).not.toContain('<style>text[');
  });

  it('haloes the labels that are placed without regard for what is underneath them', () => {
    expect(render('dark')).toContain('#mermaid-1 g.data-point text{stroke:#1f2a3d;');
    expect(render('light')).toContain('#mermaid-1 g.data-point text{stroke:#ffffff;');
    expect(render('dark')).toContain('paint-order:stroke;');
    expect(render('dark')).toContain('#mermaid-1 .node-labels text{stroke:#060913;');
  });

  it('blends the sankey flows away from the diagram surface instead of into it', () => {
    expect(render('dark')).toContain('#mermaid-1 .link{mix-blend-mode:screen;}');
    expect(render('light')).toContain('#mermaid-1 .link{mix-blend-mode:multiply;}');
  });

  it('keeps the diagram intact and appends the rules inside the svg', () => {
    expect(render('dark')).toMatch(/<text fill="#444444">Rand<\/text><style>.*<\/style><\/svg>$/);
    expect(withMermaidStyleOverrides('no svg here', 'mermaid-1', 'dark')).toBe('no svg here');
  });
});

describe('getReadableMermaidInk', () => {
  it('puts dark ink on light fills and light ink on dark fills', () => {
    expect(getReadableMermaidInk('#eef', 'dark')).toBe(DARK_INK);
    expect(getReadableMermaidInk('#7c2d12', 'light')).toBe(LIGHT_INK);
    expect(getReadableMermaidInk('rgb(238, 238, 255)', 'dark')).toBe(DARK_INK);
  });

  it('falls back to the diagram surface when no fill is set', () => {
    expect(getReadableMermaidInk(null, 'dark')).toBe(LIGHT_INK);
    expect(getReadableMermaidInk('none', 'light')).toBe(DARK_INK);
  });

  it('resolves translucent fills against the diagram surface', () => {
    expect(getReadableMermaidInk('rgba(255, 255, 255, 0.05)', 'dark')).toBe(LIGHT_INK);
  });
});

describe('applyMermaidLabelContrast', () => {
  it('recolors labels of nodes whose fill was overridden by the diagram author', () => {
    const host = renderSvg(createNodeSvg({ fill: '#eef' }));

    applyMermaidLabelContrast(host, 'dark');

    const label = host.querySelector<HTMLElement>('span.nodeLabel');

    expect(host.querySelector('g.node')?.getAttribute('data-mermaid-ink')).toBe(DARK_INK);
    expect(label?.style.color).toBe(DARK_INK_RGB);
  });

  it('keeps an explicit label color from style or classDef', () => {
    const host = renderSvg(createNodeSvg({ fill: '#7c2d12', labelColor: '#fff' }));

    applyMermaidLabelContrast(host, 'dark');

    expect(host.querySelector('g.node')?.hasAttribute('data-mermaid-ink')).toBe(false);
    expect(host.querySelector<HTMLElement>('span.nodeLabel')?.style.color).toBe('');
  });

  it('colors cluster labels independently of the nodes inside them', () => {
    const host = renderSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <g class="cluster" id="cluster-1">
          <rect style="fill:#eef !important"></rect>
          <g class="cluster-label">
            <foreignObject width="100" height="20"><div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">Gruppe</span></div></foreignObject>
          </g>
          <g class="node default" id="node-1">
            <rect class="basic label-container" style="fill:#1f2a3d !important"></rect>
            <g class="label">
              <foreignObject width="100" height="20"><div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel" id="inner">Knoten</span></div></foreignObject>
            </g>
          </g>
        </g>
      </svg>
    `);

    applyMermaidLabelContrast(host, 'dark');

    expect(host.querySelector('g.cluster')?.getAttribute('data-mermaid-ink')).toBe(DARK_INK);
    expect(host.querySelector('g.node')?.getAttribute('data-mermaid-ink')).toBe(LIGHT_INK);
    expect(host.querySelector<HTMLElement>('#inner')?.style.color).toBe(LIGHT_INK_RGB);
  });

  it('reads the fill from a wrapped shape and ignores the unfilled border path', () => {
    const host = renderSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <g class="node default" id="node-1">
          <g class="basic label-container outer-path">
            <path d="M0 0" fill="#1f2a3d"></path>
            <path d="M0 0" fill="none" stroke="#7c8ba3"></path>
          </g>
          <g class="label">
            <foreignObject width="100" height="20"><div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">Klasse</span></div></foreignObject>
          </g>
        </g>
      </svg>
    `);

    applyMermaidLabelContrast(host, 'dark');

    expect(host.querySelector('g.node')?.getAttribute('data-mermaid-ink')).toBe(LIGHT_INK);
    expect(host.querySelector<HTMLElement>('span.nodeLabel')?.style.color).toBe(LIGHT_INK_RGB);
  });

  it('ignores missing roots', () => {
    expect(() => applyMermaidLabelContrast(null, 'dark')).not.toThrow();
  });
});

describe('applyMermaidLabelContrastToMarkup', () => {
  it('returns markup with corrected label colors and leaves no helper node behind', () => {
    const markup = applyMermaidLabelContrastToMarkup(createNodeSvg({ fill: '#0f172a' }), 'light');

    expect(markup).toContain('<svg');
    expect(markup).toContain('data-mermaid-ink="#f1f5f9"');
    expect(markup).toContain('<b>fett</b>');
    expect(document.body.children.length).toBe(0);
  });
});
