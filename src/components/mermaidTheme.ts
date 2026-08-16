import type { MermaidConfig } from 'mermaid';

export type MermaidColorMode = 'dark' | 'light';

const MERMAID_FONT_FAMILY = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const mermaidSurfaceColors: Record<MermaidColorMode, string> = {
  dark: '#060913',
  light: '#f8fafc',
};

const mermaidInkColors: Record<MermaidColorMode, string> = {
  dark: '#f1f5f9',
  light: '#0f172a',
};

const MERMAID_SCALE_HUES = [220, 265, 190, 145, 45, 15, 330, 100, 285, 205, 30, 170];

/**
 * Section colors for scale based diagrams (timeline, journey). Without them the base theme
 * derives the scale from `primaryColor` and darkens it by 75 in dark mode, which turns every
 * section into plain black on the already dark diagram surface.
 */
const createMermaidScaleVariables = (saturation: number, lightness: number) => Object.fromEntries(
  MERMAID_SCALE_HUES.map((hue, index) => (
    [`cScale${index}`, `hsl(${hue}, ${saturation}%, ${lightness}%)`]
  )),
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
  const darkInk = parseCssColor(mermaidInkColors.light);
  const lightInk = parseCssColor(mermaidInkColors.dark);

  if (!darkInk || !lightInk) {
    return mermaidInkColors[mode];
  }

  return getContrastRatio(darkInk, background) >= getContrastRatio(lightInk, background)
    ? mermaidInkColors.light
    : mermaidInkColors.dark;
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
 * Branch colors for `gitGraph`. The base theme lightens them in dark mode and darkens them
 * otherwise — but it reads `darkMode` from the theme variables, which mermaid never fills in from
 * the config, so in dark mode every commit and every arrow ends up darkened to plain black.
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
      [`gitInv${index}`, mermaidInkColors[mode]],
    ];
  }),
);

/**
 * The packet renderer paints the bit numbers and the title straight onto the diagram
 * surface and defaults all of them to black, which is invisible in dark mode.
 */
const mermaidPacketVariables: Record<MermaidColorMode, Record<string, string>> = {
  dark: {
    blockFillColor: '#1f2a3d',
    blockStrokeColor: '#64748b',
    endByteColor: '#cbd5e1',
    labelColor: mermaidInkColors.dark,
    startByteColor: '#cbd5e1',
    titleColor: mermaidInkColors.dark,
  },
  light: {
    blockFillColor: '#ffffff',
    blockStrokeColor: '#94a3b8',
    endByteColor: '#334155',
    labelColor: mermaidInkColors.light,
    startByteColor: '#334155',
    titleColor: mermaidInkColors.light,
  },
};

type MermaidThemeVariables = Record<string, string | Record<string, string>>;

const mermaidThemeVariables: Record<MermaidColorMode, MermaidThemeVariables> = {
  dark: {
    // Kanban and friends brighten the scale by roughly ten lightness points for their section
    // background, so the base has to stay dark enough for the light section titles.
    ...createMermaidScaleVariables(42, 22),
    ...createMermaidGitVariables(55, 66, 'dark'),
    packet: mermaidPacketVariables.dark,
    background: mermaidSurfaceColors.dark,
    primaryColor: '#1f2a3d',
    primaryTextColor: mermaidInkColors.dark,
    primaryBorderColor: '#64748b',
    secondaryColor: '#2c2450',
    secondaryTextColor: mermaidInkColors.dark,
    secondaryBorderColor: '#6d5aa8',
    tertiaryColor: '#101a2c',
    tertiaryTextColor: mermaidInkColors.dark,
    tertiaryBorderColor: '#3a4a66',
    lineColor: '#9aa8bd',
    textColor: '#e2e8f0',
    mainBkg: '#1f2a3d',
    nodeBorder: '#7c8ba3',
    nodeTextColor: mermaidInkColors.dark,
    clusterBkg: '#0d1626',
    clusterBorder: '#3a4a66',
    titleColor: mermaidInkColors.dark,
    edgeLabelBackground: '#101a2c',
    labelBackground: '#101a2c',
    labelBoxBkgColor: '#1f2a3d',
    labelTextColor: mermaidInkColors.dark,
    noteBkgColor: '#2a3550',
    noteTextColor: mermaidInkColors.dark,
    noteBorderColor: '#5a6b8c',
    errorBkgColor: '#4c1d24',
    errorTextColor: '#fecaca',
    // ER attribute rows. The base theme derives them from `mainBkg` and picks the branch by the
    // `darkMode` theme variable, which mermaid does not fill in from the config, so without these
    // the rows turn near white and swallow the light attribute text.
    rowOdd: '#1b2536',
    rowEven: '#141d2e',
    // The sequence number sits inside a circle filled with `lineColor`.
    sequenceNumberColor: '#0b1220',
    // A quadrant chart centers each data point label on its own point, so the point color has to
    // work with the label ink as well.
    quadrantPointFill: '#44639a',
    quadrantPointTextFill: mermaidInkColors.dark,
    // Gantt bars keep their own palette. Every bar has to stay dark, because the label of a
    // bar and the label next to a bar share `taskTextDarkColor`.
    sectionBkgColor: '#5c7599',
    sectionBkgColor2: '#7a6bb0',
    altSectionBkgColor: '#8b96a8',
    excludeBkgColor: '#0d1626',
    gridColor: '#4a5a76',
    taskBkgColor: '#243247',
    taskBorderColor: '#6b7c96',
    activeTaskBkgColor: '#2f4463',
    activeTaskBorderColor: '#8aa4c8',
    doneTaskBkgColor: '#1a2333',
    doneTaskBorderColor: '#55647d',
    critBkgColor: '#5c2029',
    critBorderColor: '#f87171',
    todayLineColor: '#f87171',
    taskTextColor: mermaidInkColors.dark,
    taskTextDarkColor: mermaidInkColors.dark,
    taskTextLightColor: mermaidInkColors.dark,
    taskTextOutsideColor: mermaidInkColors.dark,
    fontFamily: MERMAID_FONT_FAMILY,
    fontSize: '15px',
  },
  light: {
    ...createMermaidScaleVariables(62, 84),
    ...createMermaidGitVariables(55, 42, 'light'),
    packet: mermaidPacketVariables.light,
    background: mermaidSurfaceColors.light,
    primaryColor: '#ffffff',
    primaryTextColor: mermaidInkColors.light,
    primaryBorderColor: '#94a3b8',
    secondaryColor: '#e2e8f0',
    secondaryTextColor: mermaidInkColors.light,
    secondaryBorderColor: '#94a3b8',
    tertiaryColor: '#eef2f7',
    tertiaryTextColor: mermaidInkColors.light,
    tertiaryBorderColor: '#cbd5e1',
    lineColor: '#475569',
    textColor: mermaidInkColors.light,
    mainBkg: '#ffffff',
    nodeBorder: '#94a3b8',
    nodeTextColor: mermaidInkColors.light,
    clusterBkg: '#eef2f7',
    clusterBorder: '#cbd5e1',
    titleColor: mermaidInkColors.light,
    edgeLabelBackground: mermaidSurfaceColors.light,
    labelBackground: mermaidSurfaceColors.light,
    labelBoxBkgColor: '#ffffff',
    labelTextColor: mermaidInkColors.light,
    noteBkgColor: '#fef9c3',
    noteTextColor: mermaidInkColors.light,
    noteBorderColor: '#ca8a04',
    errorBkgColor: '#fee2e2',
    errorTextColor: '#991b1b',
    rowOdd: '#ffffff',
    rowEven: '#eef2f7',
    sequenceNumberColor: '#f8fafc',
    quadrantPointFill: '#94a3b8',
    quadrantPointTextFill: mermaidInkColors.light,
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
    taskTextColor: mermaidInkColors.light,
    taskTextDarkColor: mermaidInkColors.light,
    taskTextLightColor: mermaidInkColors.light,
    taskTextOutsideColor: mermaidInkColors.light,
    fontFamily: MERMAID_FONT_FAMILY,
    fontSize: '15px',
  },
};

const mermaidC4InkColors: Record<MermaidColorMode, { line: string; text: string }> = {
  dark: { line: '#94a3b8', text: '#e2e8f0' },
  light: { line: '#475569', text: '#334155' },
};

/** Background of the quadrant panes, so a label halo blends into the chart. */
const mermaidQuadrantColors: Record<MermaidColorMode, string> = {
  dark: '#1f2a3d',
  light: '#ffffff',
};

/**
 * Sankey draws its flows with `mix-blend-mode: multiply`, so that crossing flows darken each
 * other. Multiplied against a near black diagram surface every flow becomes black and the diagram
 * collapses to its bare node bars. `screen` is the same idea the other way round and keeps
 * crossings visible on a dark surface — but it also brightens the flows the node labels sit on,
 * which is why those labels get a halo as well.
 */
const mermaidSankeyBlendModes: Record<MermaidColorMode, string> = {
  dark: 'screen',
  light: 'multiply',
};

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
  const { line, text } = mermaidC4InkColors[mode];
  const css = [
    `#${id} text[fill="${C4_HARDCODED_COLOR}"]{fill:${text};${haloDeclarations(mermaidSurfaceColors[mode])}}`,
    `#${id} line[stroke="${C4_HARDCODED_COLOR}"]{stroke:${line};}`,
    `#${id} rect[stroke="${C4_HARDCODED_COLOR}"]{stroke:${line};}`,
    `#${id} g.data-point text{${haloDeclarations(mermaidQuadrantColors[mode])}}`,
    `#${id} .link{mix-blend-mode:${mermaidSankeyBlendModes[mode]};}`,
    `#${id} .node-labels text{${haloDeclarations(mermaidSurfaceColors[mode])}}`,
  ].join('');
  const closingTagIndex = svg.lastIndexOf('</svg>');

  return closingTagIndex === -1
    ? svg
    : `${svg.slice(0, closingTagIndex)}<style>${css}</style>${svg.slice(closingTagIndex)}`;
};

export const getMermaidConfig = (mode: MermaidColorMode): MermaidConfig => ({
  darkMode: mode === 'dark',
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
 * author overrides the fill (`style A fill:#eef`, `classDef`), which produces unreadable
 * labels — most notably light fills in dark mode. This re-colors every label after
 * rendering based on the contrast against its own shape fill.
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
