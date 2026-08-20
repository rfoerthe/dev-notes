import type { MermaidConfig } from 'mermaid';

export type MermaidColorMode = 'dark' | 'light';

const MERMAID_FONT_FAMILY = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * Both color modes paint the diagram with the same light palette, and dark mode only tones the
 * surface down so the panel does not glare on a dark page.
 *
 * A second, dark palette means every color of every diagram type has to be derived a second time,
 * and whatever nobody re-derived quietly lost its contrast — that is where the black packet bits,
 * the black gantt bars, the black git branches and the vanishing sankey flows all came from.
 *
 * How far the surface can be toned down is bounded by the palette it carries: the faintest fills
 * of that palette are only about 1.1:1 against the light surface to begin with, so a surface much
 * darker than this either meets one of them — which makes that shape disappear — or washes out the
 * node outlines, which are what separates a white node from the surface. This value keeps every
 * one of those ratios within a tenth of what light mode has.
 */
export const mermaidSurfaceColors: Record<MermaidColorMode, string> = {
  dark: '#eaeef6',
  light: '#f8fafc',
};

/**
 * The chrome of the diagram panel: the toolbar strip above the diagram, the borders around both,
 * and the ink of the controls on them. It follows the diagram surface rather than the app's color
 * mode, because that is what it sits on — the app's own dark chrome colors would be invisible on
 * the light panel.
 */
export const mermaidPanelColors: Record<MermaidColorMode, {
  border: string;
  controlBackground: string;
  controlHoverBackground: string;
  ink: string;
  toolbar: string;
}> = {
  dark: {
    border: 'rgba(15,23,42,0.14)',
    controlBackground: 'rgba(15,23,42,0.04)',
    controlHoverBackground: 'rgba(15,23,42,0.09)',
    ink: '#475569',
    toolbar: '#dbe1ec',
  },
  light: {
    border: 'rgba(15,23,42,0.1)',
    controlBackground: 'rgba(15,23,42,0.035)',
    controlHoverBackground: 'rgba(15,23,42,0.08)',
    ink: '#475569',
    toolbar: '#e2e8f0',
  },
};

/**
 * The two inks a label can be painted with. Which of them is used is a contrast decision against
 * whatever the label sits on — see {@link getReadableMermaidInk} — never a color mode decision.
 * `onLightFill` is what the diagram surface itself carries in both modes.
 */
const mermaidInkColors = {
  onDarkFill: '#f1f5f9',
  onLightFill: '#0f172a',
};

/**
 * The ink of everything that sits on the diagram surface itself rather than on a fill of its own,
 * and what `currentColor` has to resolve to inside a diagram: parts mermaid leaves to the document
 * paint themselves with it — the gantt grid ticks are drawn by d3 that way — and would otherwise
 * pick up the app's text color, which is a light one in dark mode.
 */
export const mermaidDiagramInk = mermaidInkColors.onLightFill;

const MERMAID_SCALE_HUES = [220, 265, 190, 145, 45, 15, 330, 100, 285, 205, 30, 170];

/**
 * Section colors for scale based diagrams (timeline, journey, mindmap, kanban, treemap). Without
 * them the base theme derives the scale from `primaryColor`, which is plain white here, and every
 * section ends up the same white as the nodes on it.
 *
 * `cScalePeer` is derived from `cScale` by the base theme and is what kanban and treemap actually
 * paint their sections with, so it is pinned here too — otherwise the derived offset pushes the
 * brighter hues out of the range where a label can still be read on them.
 *
 * Both bands stay light enough to carry the dark ink, which is the only one the section titles
 * get: mermaid colors them from a single variable, not per section.
 */
const createMermaidScaleVariables = (
  saturation: number,
  lightness: number,
  peerLightness: number,
) => Object.fromEntries(
  MERMAID_SCALE_HUES.flatMap((hue, index) => [
    [`cScale${index}`, hslToHex(hue, saturation, lightness)],
    [`cScalePeer${index}`, hslToHex(hue, saturation, peerLightness)],
  ]),
);

const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR_REGEX = /^rgba?\(([^)]+)\)$/i;

interface MermaidRgbColor {
  alpha: number;
  blue: number;
  green: number;
  red: number;
}

const parseHexColor = (value: string): MermaidRgbColor | null => {
  if (!HEX_COLOR_REGEX.test(value)) {
    return null;
  }

  const digits = value.slice(1);
  const expanded = digits.length <= 4
    ? digits.split('').map((digit) => `${digit}${digit}`).join('')
    : digits;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;

  return { alpha, blue, green, red };
};

const parseRgbColor = (value: string): MermaidRgbColor | null => {
  const match = RGB_COLOR_REGEX.exec(value);

  if (!match) {
    return null;
  }

  const parts = match[1]
    .split(/[\s,/]+/)
    .filter((part) => part.length > 0)
    .map((part) => Number.parseFloat(part));

  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) {
    return null;
  }

  return {
    alpha: parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1,
    blue: parts[2],
    green: parts[1],
    red: parts[0],
  };
};

export const parseCssColor = (value: string | null | undefined): MermaidRgbColor | null => {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized === 'none' || normalized === 'transparent') {
    return null;
  }

  return parseHexColor(normalized) ?? parseRgbColor(normalized);
};

const toLinearChannel = (channel: number) => {
  const normalized = channel / 255;

  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const getRelativeLuminance = (color: MermaidRgbColor) => (
  (0.2126 * toLinearChannel(color.red))
  + (0.7152 * toLinearChannel(color.green))
  + (0.0722 * toLinearChannel(color.blue))
);

const getContrastRatio = (first: MermaidRgbColor, second: MermaidRgbColor) => {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

const blendOverSurface = (color: MermaidRgbColor, surface: MermaidRgbColor): MermaidRgbColor => {
  if (color.alpha >= 1) {
    return color;
  }

  return {
    alpha: 1,
    blue: (color.blue * color.alpha) + (surface.blue * (1 - color.alpha)),
    green: (color.green * color.alpha) + (surface.green * (1 - color.alpha)),
    red: (color.red * color.alpha) + (surface.red * (1 - color.alpha)),
  };
};

/**
 * Picks the ink color with the better contrast ratio on the given shape fill so that
 * hand-written `style`/`classDef` fills stay readable in both color modes.
 */
export const getReadableMermaidInk = (
  fill: string | null | undefined,
  mode: MermaidColorMode,
): string => {
  const surface = parseCssColor(mermaidSurfaceColors[mode]) ?? { alpha: 1, blue: 0, green: 0, red: 0 };
  const parsedFill = parseCssColor(fill);
  const background = parsedFill ? blendOverSurface(parsedFill, surface) : surface;
  const darkInk = parseCssColor(mermaidInkColors.onLightFill);
  const lightInk = parseCssColor(mermaidInkColors.onDarkFill);

  if (!darkInk || !lightInk) {
    return mermaidDiagramInk;
  }

  return getContrastRatio(darkInk, background) >= getContrastRatio(lightInk, background)
    ? mermaidInkColors.onLightFill
    : mermaidInkColors.onDarkFill;
};

const MERMAID_GIT_HUES = [220, 265, 190, 145, 45, 15, 330, 100];

const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs((2 * l) - 1)) * s;
  const channel = (offset: number) => {
    const shifted = (offset + (hue / 30)) % 12;
    const value = l - ((chroma / 2) * Math.max(-1, Math.min(shifted - 3, 9 - shifted, 1)));

    return Math.round(value * 255).toString(16).padStart(2, '0');
  };

  return `#${channel(0)}${channel(8)}${channel(4)}`;
};

/**
 * Branch colors for `gitGraph`. The base theme derives them from a fixed list and darkens every
 * one of them, which drags the darker hues of that list towards black.
 *
 * `gitBranchLabel*` colors the branch name, which sits on a background of the branch color, and
 * a palette that spans all hues needs a different ink per branch. `gitInv*` is the ring of a
 * highlighted commit, drawn around a disc in `primaryColor`, so it has to read on the surface.
 */
const createMermaidGitVariables = (
  saturation: number,
  lightness: number,
  mode: MermaidColorMode,
) => Object.fromEntries(
  MERMAID_GIT_HUES.flatMap((hue, index) => {
    const color = hslToHex(hue, saturation, lightness);

    return [
      [`git${index}`, color],
      [`gitBranchLabel${index}`, getReadableMermaidInk(color, mode)],
      [`gitInv${index}`, mermaidDiagramInk],
    ];
  }),
);

/**
 * Slice colors for the pie chart and plot colors for the xy chart. Both default to a palette the
 * diagram surface cannot carry: the pie derives its slices from `primaryColor`, which is plain
 * white here, and the xy chart ships a fixed list of pastels that is barely darker than the
 * surface it is plotted on.
 */
const createMermaidChartVariables = (
  saturation: number,
  lightness: number,
  mode: MermaidColorMode,
) => {
  const colors = MERMAID_SCALE_HUES.map((hue) => hslToHex(hue, saturation, lightness));

  return {
    ...Object.fromEntries(colors.map((color, index) => [`pie${index + 1}`, color])),
    // Separates neighbouring slices; the ring around the chart has to read on the surface instead.
    pieStrokeColor: mermaidSurfaceColors[mode],
    pieOuterStrokeColor: '#94a3b8',
    // Slices are painted at 70% by default, which drags every color towards the surface and makes
    // the ink below unpredictable.
    pieOpacity: '1',
    // The percentage on a slice is the only pie label that does not sit on the diagram surface,
    // and mermaid offers a single color for all of them. The lightness of the palette is therefore
    // chosen so that one ink clears 4.5:1 on every hue in it.
    pieSectionTextColor: getReadableMermaidInk(colors[0], mode),
    // Mermaid re-applies an overridden theme variable after deriving the defaults, so a nested
    // object replaces the derived one instead of merging into it. Anything left out here is
    // `undefined` for the renderer — dropping `backgroundColor` alone turns the plot area white.
    xyChart: {
      backgroundColor: mermaidSurfaceColors[mode],
      titleColor: mermaidDiagramInk,
      xAxisLabelColor: mermaidDiagramInk,
      xAxisTitleColor: mermaidDiagramInk,
      xAxisTickColor: mermaidDiagramInk,
      xAxisLineColor: '#475569',
      yAxisLabelColor: mermaidDiagramInk,
      yAxisTitleColor: mermaidDiagramInk,
      yAxisTickColor: mermaidDiagramInk,
      yAxisLineColor: '#475569',
      plotColorPalette: colors.slice(0, 10).join(','),
    },
  };
};

/**
 * The packet renderer reads none of the theme variables above — it has a theme block of its own,
 * defaulting to black text on a grey block. These values put it on the same white blocks and the
 * same inks as every other diagram type.
 */
const mermaidPacketVariables: Record<string, string> = {
  blockFillColor: '#ffffff',
  blockStrokeColor: '#94a3b8',
  endByteColor: '#334155',
  labelColor: mermaidDiagramInk,
  startByteColor: '#334155',
  titleColor: mermaidDiagramInk,
};

type MermaidThemeVariables = Record<string, string | Record<string, string | number>>;

/**
 * One palette for both color modes; only the surface it is painted on differs. Everything the
 * base theme would otherwise derive for itself is pinned here, because those derivations assume
 * their own palette and reach a different shade of it per diagram type.
 */
const createMermaidThemeVariables = (mode: MermaidColorMode): MermaidThemeVariables => ({
  ...createMermaidScaleVariables(62, 84, 94),
  ...createMermaidGitVariables(55, 42, mode),
  ...createMermaidChartVariables(55, 32, mode),
  packet: mermaidPacketVariables,
  // Same replacement rule as `xyChart` above: every key the renderer reads has to be present.
  // Its graticule otherwise defaults to a fixed light grey that vanishes on a light surface.
  radar: {
    axisColor: '#475569',
    axisStrokeWidth: 2,
    axisLabelFontSize: 12,
    curveOpacity: 0.5,
    curveStrokeWidth: 2,
    graticuleColor: '#94a3b8',
    graticuleStrokeWidth: 1,
    graticuleOpacity: 0.6,
    legendBoxSize: 12,
    legendFontSize: 12,
  },
  background: mermaidSurfaceColors[mode],
  primaryColor: '#ffffff',
  primaryTextColor: mermaidDiagramInk,
  primaryBorderColor: '#94a3b8',
  secondaryColor: '#e2e8f0',
  secondaryTextColor: mermaidDiagramInk,
  secondaryBorderColor: '#94a3b8',
  tertiaryColor: '#eef2f7',
  tertiaryTextColor: mermaidDiagramInk,
  tertiaryBorderColor: '#cbd5e1',
  lineColor: '#475569',
  textColor: mermaidDiagramInk,
  mainBkg: '#ffffff',
  nodeBorder: '#94a3b8',
  nodeTextColor: mermaidDiagramInk,
  clusterBkg: '#eef2f7',
  clusterBorder: '#cbd5e1',
  titleColor: mermaidDiagramInk,
  // Both sit behind a label that is placed on top of an edge, so they have to match the surface
  // the edge is drawn on rather than be a color of their own.
  edgeLabelBackground: mermaidSurfaceColors[mode],
  labelBackground: mermaidSurfaceColors[mode],
  labelBoxBkgColor: '#ffffff',
  labelTextColor: mermaidDiagramInk,
  noteBkgColor: '#fef9c3',
  noteTextColor: mermaidDiagramInk,
  noteBorderColor: '#ca8a04',
  errorBkgColor: '#fee2e2',
  errorTextColor: '#991b1b',
  // ER attribute rows. The base theme derives them from `mainBkg`, which is the same white as the
  // entity box, so without these the rows and their box become one surface.
  rowOdd: '#ffffff',
  rowEven: '#eef2f7',
  // The sequence number sits inside a circle filled with `lineColor`.
  sequenceNumberColor: mermaidSurfaceColors[mode],
  // A quadrant chart centers each data point label on its own point, so the point color has to
  // work with the label ink as well.
  quadrantPointFill: '#94a3b8',
  quadrantPointTextFill: mermaidDiagramInk,
  // Gantt bars keep their own palette. Every bar has to stay light, because the label of a
  // bar and the label next to a bar share `taskTextDarkColor`.
  sectionBkgColor: '#c7d5e8',
  sectionBkgColor2: '#d5cdf0',
  altSectionBkgColor: '#e8edf4',
  excludeBkgColor: '#eef2f7',
  gridColor: '#94a3b8',
  taskBkgColor: '#dbe6f4',
  taskBorderColor: '#7d93b3',
  activeTaskBkgColor: '#bcd2ee',
  activeTaskBorderColor: '#5b7ba6',
  doneTaskBkgColor: '#e6ebf2',
  doneTaskBorderColor: '#94a3b8',
  critBkgColor: '#fecdd3',
  critBorderColor: '#be123c',
  todayLineColor: '#dc2626',
  taskTextColor: mermaidDiagramInk,
  taskTextDarkColor: mermaidDiagramInk,
  taskTextLightColor: mermaidDiagramInk,
  taskTextOutsideColor: mermaidDiagramInk,
  fontFamily: MERMAID_FONT_FAMILY,
  fontSize: '15px',
});

const mermaidThemeVariables: Record<MermaidColorMode, MermaidThemeVariables> = {
  dark: createMermaidThemeVariables('dark'),
  light: createMermaidThemeVariables('light'),
};

const mermaidC4InkColors = { line: '#475569', text: '#334155' };

/** Background of the quadrant panes, so a label halo blends into the chart. */
const MERMAID_QUADRANT_COLOR = '#ffffff';

/**
 * Sankey draws its flows with `mix-blend-mode: multiply`, so that crossing flows darken each
 * other. That only works on a light surface — multiplied against a dark one every flow turns
 * black and the diagram collapses to its bare node bars, which is one of the reasons both color
 * modes keep the surface light.
 */
const MERMAID_SANKEY_BLEND_MODE = 'multiply';

const C4_HARDCODED_COLOR = '#444444';

/**
 * Draws the glyphs on top of a thick outline in the surrounding background color, so a label
 * stays readable on whatever it happens to overlap.
 */
const haloDeclarations = (color: string) => (
  `stroke:${color};stroke-width:3px;stroke-linejoin:round;paint-order:stroke;`
);

/**
 * Mermaid embeds its own stylesheet inside the diagram and scopes every rule with the diagram id,
 * because an SVG `<style>` is not scoped to its document fragment. The overrides have to do the
 * same or they would leak into every other diagram on the page.
 *
 * They cover the cases the theme variables cannot reach: C4 hard-codes `#444444` for boundary
 * labels, boundary borders and relation labels; both C4 relation labels and quadrant data point
 * labels are placed without regard for what is underneath them — a relation label follows its
 * arrow across other shapes, and a data point label is centered on its own point, whose color the
 * diagram author can choose freely; and the sankey flows blend with the diagram surface.
 */
export const withMermaidStyleOverrides = (
  svg: string,
  id: string,
  mode: MermaidColorMode,
): string => {
  const { line, text } = mermaidC4InkColors;
  const css = [
    `#${id} text[fill="${C4_HARDCODED_COLOR}"]{fill:${text};${haloDeclarations(mermaidSurfaceColors[mode])}}`,
    `#${id} line[stroke="${C4_HARDCODED_COLOR}"]{stroke:${line};}`,
    `#${id} rect[stroke="${C4_HARDCODED_COLOR}"]{stroke:${line};}`,
    `#${id} g.data-point text{${haloDeclarations(MERMAID_QUADRANT_COLOR)}}`,
    `#${id} .link{mix-blend-mode:${MERMAID_SANKEY_BLEND_MODE};}`,
    `#${id} .node-labels text{${haloDeclarations(mermaidSurfaceColors[mode])}}`,
  ].join('');
  const closingTagIndex = svg.lastIndexOf('</svg>');

  return closingTagIndex === -1
    ? svg
    : `${svg.slice(0, closingTagIndex)}<style>${css}</style>${svg.slice(closingTagIndex)}`;
};

export const getMermaidConfig = (mode: MermaidColorMode): MermaidConfig => ({
  // The base theme derives a good part of its colors twice, once per branch of this flag, and the
  // dark branch assumes a dark surface. Both color modes render on a light one here.
  darkMode: false,
  flowchart: {
    htmlLabels: true,
  },
  fontFamily: MERMAID_FONT_FAMILY,
  htmlLabels: true,
  securityLevel: 'strict',
  startOnLoad: false,
  theme: 'base',
  themeVariables: mermaidThemeVariables[mode],
});

const SHAPE_SELECTOR = 'rect, circle, ellipse, polygon, path';
const LABEL_CONTAINER_SELECTORS = [
  'g.node',
  'g.cluster',
  'g.statediagram-cluster',
  'g.classGroup',
  'g.stateGroup',
  // C4 wraps every shape — person, system, container, component — in this group and always
  // labels it white, which is unreadable on the lighter shades of the C4 palette.
  'g.person-man',
].join(', ');

const readInlineDeclaration = (element: Element | null | undefined, property: string) => (
  element?.getAttribute('style')?.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;!]+)`, 'i'))?.[1]?.trim()
    ?? null
);

/**
 * Mermaid writes an explicit `color:` from `style`/`classDef` onto the label group.
 * Those are deliberate author choices and stay untouched.
 */
const getAuthorLabelColor = (container: Element): string | null => (
  readInlineDeclaration(container.querySelector(':scope > g.label'), 'color')
  ?? readInlineDeclaration(container.querySelector(':scope > .cluster-label'), 'color')
);

// The computed value already covers inline styles, class rules and presentation attributes;
// the other two are the fallback for environments without a layout engine.
const readShapeFill = (shape: Element): string | null => {
  const computedFill = typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
    ? window.getComputedStyle(shape).fill
    : null;

  return [computedFill, readInlineDeclaration(shape, 'fill'), shape.getAttribute('fill')]
    .find((fill) => parseCssColor(fill)) ?? null;
};

/**
 * Collects the shape candidates of a node in painting order. Mermaid either puts the shape
 * directly into the node group or wraps it — class diagrams for instance use a group that
 * holds a filled body path plus an unfilled border path.
 */
const getShapeCandidates = (container: Element): Element[] => {
  const labelContainer = container.querySelector(':scope > .label-container');
  const candidates = labelContainer
    ? [labelContainer, ...Array.from(labelContainer.querySelectorAll(SHAPE_SELECTOR))]
    : [];

  return [
    ...candidates,
    ...Array.from(container.children),
  ].filter((candidate) => candidate.matches(SHAPE_SELECTOR));
};

// `fill="none"` belongs to the border path drawn on top of the body, so the first
// candidate that actually paints wins.
const getShapeFill = (container: Element): string | null => (
  getShapeCandidates(container).map(readShapeFill).find((fill) => fill !== null) ?? null
);

// Labels are either HTML inside a `foreignObject` or plain SVG text.
const LABEL_SELECTOR = 'div, span, p, text, tspan';

const applyInkToLabels = (container: Element, ink: string) => {
  container
    .querySelectorAll<SVGElement | HTMLElement>(LABEL_SELECTOR)
    .forEach((label) => {
      // Nested nodes inside a cluster own their labels and are colored separately.
      if (label.closest(LABEL_CONTAINER_SELECTORS) !== container) {
        return;
      }

      label.style.setProperty('color', ink, 'important');

      if (label.namespaceURI === 'http://www.w3.org/2000/svg') {
        label.style.setProperty('fill', ink, 'important');
      }
    });
};

/**
 * Mermaid keeps the label color of a node at the theme default even when the diagram
 * author overrides the fill (`style A fill:#0f172a`, `classDef`), which produces unreadable
 * labels — most notably the dark ink of this theme on a dark fill. This re-colors every label
 * after rendering based on the contrast against its own shape fill.
 */
export const applyMermaidLabelContrast = (
  root: Element | null | undefined,
  mode: MermaidColorMode,
) => {
  if (!root) {
    return;
  }

  const containers = root.matches(LABEL_CONTAINER_SELECTORS)
    ? [root, ...Array.from(root.querySelectorAll(LABEL_CONTAINER_SELECTORS))]
    : Array.from(root.querySelectorAll(LABEL_CONTAINER_SELECTORS));

  containers.forEach((container) => {
    if (getAuthorLabelColor(container)) {
      return;
    }

    const ink = getReadableMermaidInk(getShapeFill(container), mode);

    if (container.getAttribute('data-mermaid-ink') === ink) {
      return;
    }

    container.setAttribute('data-mermaid-ink', ink);
    applyInkToLabels(container, ink);
  });
};

/**
 * Same contrast pass as {@link applyMermaidLabelContrast}, but for a serialized diagram
 * (SVG download). The markup is attached off-screen because the fill of a node can also
 * come from the stylesheet Mermaid embeds in the diagram.
 */
export const applyMermaidLabelContrastToMarkup = (svg: string, mode: MermaidColorMode): string => {
  if (typeof document === 'undefined') {
    return svg;
  }

  const host = document.createElement('div');

  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;';
  host.innerHTML = svg;
  document.body.appendChild(host);

  try {
    applyMermaidLabelContrast(host, mode);
    return host.innerHTML;
  } finally {
    host.remove();
  }
};
