import { afterEach, describe, expect, it } from 'vitest';
import {
  applyMermaidLabelContrast,
  applyMermaidLabelContrastToMarkup,
  getMermaidConfig,
  getReadableMermaidInk,
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

    expect(Object.keys(darkVariables).filter((key) => key.startsWith('cScale'))).toHaveLength(12);
    expect(Object.keys(lightVariables).filter((key) => key.startsWith('cScale'))).toHaveLength(12);
    expect(darkVariables.cScale0).not.toBe(lightVariables.cScale0);
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
