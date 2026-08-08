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

const mermaidThemeVariables: Record<MermaidColorMode, Record<string, string>> = {
  dark: {
    ...createMermaidScaleVariables(42, 26),
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
    fontFamily: MERMAID_FONT_FAMILY,
    fontSize: '15px',
  },
  light: {
    ...createMermaidScaleVariables(62, 84),
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
    fontFamily: MERMAID_FONT_FAMILY,
    fontSize: '15px',
  },
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

const SHAPE_SELECTOR = 'rect, circle, ellipse, polygon, path';
const LABEL_CONTAINER_SELECTORS = [
  'g.node',
  'g.cluster',
  'g.statediagram-cluster',
  'g.classGroup',
  'g.stateGroup',
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
