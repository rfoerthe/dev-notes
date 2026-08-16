import mermaid from 'mermaid';
import {
  applyMermaidLabelContrast,
  getMermaidConfig,
  type MermaidColorMode,
  withMermaidStyleOverrides,
} from '../../src/components/mermaidTheme';
import { MERMAID_FIXTURES } from './fixtures';

/** WCAG 1.4.11 for graphical objects, WCAG 1.4.3 for text. */
const MIN_SHAPE_RATIO = 3;
const MIN_TEXT_RATIO = 4.5;

/**
 * The visibility floor. Below this a shape is not merely faint, it is gone: `#000` on the
 * `#060913` diagram surface lands at 1.03.
 *
 * The blocking rule is built from this one number: a shape fails when it drops below the floor in
 * one color mode but stays above it in the other. Shapes below it in *both* modes are mermaid's
 * own structure — a diagram background rect, a row fill that matches its box, the hairline
 * polygons roughjs draws for dividers — and shapes above it in both are fine. Only the asymmetry
 * is a theme bug.
 *
 * An absolute WCAG 1.4.11 threshold cannot serve as the blocking rule here: a sankey ribbon is
 * translucent by design and reaches only about 1.5:1 even where it renders correctly, so demanding
 * 3:1 of the healthy mode would have made this audit blind to the very sankey regression it was
 * written for. The WCAG view is reported separately under `--strict`.
 */
const VANISHED_RATIO = 1.5;

interface Rgb { r: number; g: number; b: number; a: number }

const parseColor = (value: string | null | undefined): Rgb | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'none' || normalized === 'transparent') return null;

  const rgb = /^rgba?\(([^)]+)\)$/i.exec(normalized);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number.parseFloat);
    if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }

  const hex = /^#([0-9a-f]{3,8})$/i.exec(normalized);
  if (hex) {
    const digits = hex[1].length <= 4 ? hex[1].split('').map((d) => d + d).join('') : hex[1];
    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
      a: digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1,
    };
  }

  return null;
};

const toLinear = (channel: number) => {
  const n = channel / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
};

const luminance = (c: Rgb) => (
  (0.2126 * toLinear(c.r)) + (0.7152 * toLinear(c.g)) + (0.0722 * toLinear(c.b))
);

const contrast = (a: Rgb, b: Rgb) => {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

/**
 * Composites a paint over its backdrop the way the browser does: blend first, then source-over
 * with the paint's alpha. Without the blend step a sankey flow — drawn with `multiply` — would be
 * measured as its own bright color instead of the near black it actually turns into on a dark
 * surface.
 */
const composite = (paint: Rgb, backdrop: Rgb, blendMode: string): Rgb => {
  const blend = (source: number, target: number) => {
    if (blendMode === 'multiply') return (source * target) / 255;
    if (blendMode === 'screen') return 255 - (((255 - source) * (255 - target)) / 255);
    return source;
  };
  const mix = (source: number, target: number) => (
    (blend(source, target) * paint.a) + (target * (1 - paint.a))
  );

  return {
    r: mix(paint.r, backdrop.r),
    g: mix(paint.g, backdrop.g),
    b: mix(paint.b, backdrop.b),
    a: 1,
  };
};

const opacityChain = (element: Element, root: Element) => {
  let total = 1;
  let node: Element | null = element;
  while (node && node !== root) {
    const value = Number.parseFloat(getComputedStyle(node).opacity || '1');
    total *= Number.isNaN(value) ? 1 : value;
    node = node.parentElement;
  }
  return total;
};

const SHAPE_SELECTOR = 'rect, circle, ellipse, polygon, polyline, path, line';
const UNRENDERED = 'defs, marker, clippath, mask, pattern, symbol';

interface PaintedShape {
  element: Element;
  box: DOMRect;
  fill: Rgb[];
  stroke: Rgb[];
  blendMode: string;
}

const isRendered = (element: Element) => !element.closest(UNRENDERED);

/**
 * Headless Chrome does not expose `mix-blend-mode` on SVG geometry through `getComputedStyle` —
 * it answers `normal` for a sankey flow that the diagram's own stylesheet sets to `multiply`. The
 * rules themselves are readable, so the declaration is looked up there instead. Getting this wrong
 * is not cosmetic: `multiply` against a near black surface is what made the sankey flows vanish,
 * and reading `normal` would measure them as their own bright color.
 */
const blendModeOf = (element: Element, root: Element) => {
  const computed = getComputedStyle(element).mixBlendMode;
  if (computed && computed !== 'normal') return computed;

  let declared = 'normal';

  root.querySelectorAll('style').forEach((styleElement) => {
    const sheet = (styleElement as HTMLStyleElement).sheet;
    if (!sheet) return;

    Array.from(sheet.cssRules).forEach((rule) => {
      if (!(rule instanceof CSSStyleRule)) return;
      const value = rule.style.getPropertyValue('mix-blend-mode');
      if (!value) return;
      try {
        if (element.matches(rule.selectorText)) declared = value.trim();
      } catch {
        // A selector this browser cannot parse simply does not contribute.
      }
    });
  });

  return declared;
};

/**
 * A paint can be a reference to a gradient rather than a color — sankey draws every flow with
 * one. Resolving it to its stops matters: without this the flows are not measured at all, and the
 * audit would miss a diagram that is entirely invisible.
 */
const resolvePaint = (value: string | null, root: Element): Rgb[] => {
  const direct = parseColor(value);
  if (direct) return [direct];

  const reference = /^url\(["']?#([^"')]+)["']?\)/.exec(value?.trim() ?? '');
  if (!reference) return [];

  const server = root.ownerDocument.getElementById(reference[1]);
  if (!server) return [];

  return Array.from(server.querySelectorAll('stop'))
    .map((stop) => {
      const style = getComputedStyle(stop);
      const color = parseColor(style.stopColor);
      if (!color) return null;
      const stopOpacity = Number.parseFloat(style.stopOpacity || '1');
      color.a *= Number.isNaN(stopOpacity) ? 1 : stopOpacity;
      return color;
    })
    .filter((color): color is Rgb => color !== null);
};

const readShape = (element: Element, root: Element): PaintedShape | null => {
  if (!isRendered(element)) return null;

  const box = element.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) return null;

  const style = getComputedStyle(element);
  const chain = opacityChain(element, root);

  const fillOpacity = Number.parseFloat(style.fillOpacity || '1');
  const fill = resolvePaint(style.fill, root)
    .map((color) => ({ ...color, a: color.a * (Number.isNaN(fillOpacity) ? 1 : fillOpacity) * chain }))
    .filter((color) => color.a > 0);

  const strokeWidth = Number.parseFloat(style.strokeWidth || '0');
  const strokeOpacity = Number.parseFloat(style.strokeOpacity || '1');
  const stroke = strokeWidth > 0
    ? resolvePaint(style.stroke, root)
      .map((color) => ({ ...color, a: color.a * (Number.isNaN(strokeOpacity) ? 1 : strokeOpacity) * chain }))
      .filter((color) => color.a > 0)
    : [];

  if (fill.length === 0 && stroke.length === 0) return null;

  return { element, box, fill, stroke, blendMode: blendModeOf(element, root) };
};

/** Backdrops are approximated by the mean of a gradient's stops; foregrounds use every stop. */
const averagePaint = (colors: Rgb[]): Rgb => colors.reduce((acc, color, index) => ({
  r: acc.r + ((color.r - acc.r) / (index + 1)),
  g: acc.g + ((color.g - acc.g) / (index + 1)),
  b: acc.b + ((color.b - acc.b) / (index + 1)),
  a: acc.a + ((color.a - acc.a) / (index + 1)),
}), { r: 0, g: 0, b: 0, a: 0 });

/**
 * Everything painted underneath `index`, composited onto the diagram surface. Only shapes with a
 * fill count: an edge or a connector is `fill: none` and paints nothing but its own thin stroke,
 * so its bounding box must not be mistaken for a backdrop.
 */
const backdropAt = (shapes: PaintedShape[], index: number, x: number, y: number, surface: Rgb) => {
  let result = surface;

  for (let i = 0; i < index; i += 1) {
    const candidate = shapes[i];
    if (candidate.fill.length === 0) continue;
    const { box } = candidate;
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue;
    result = composite(averagePaint(candidate.fill), result, candidate.blendMode);
  }

  return result;
};

const describe = (element: Element) => {
  const own = element.getAttribute('class');
  const group = element.closest('g[class]')?.getAttribute('class');
  return [element.tagName.toLowerCase(), own, group].filter(Boolean).join(' · ');
};

export interface TextFinding {
  mode: MermaidColorMode;
  kind: string;
  what: string;
  ratio: number;
  paint: string;
  behind: string;
  sample: string;
}

/** One painted shape, measured against the backdrop it sits on. */
export interface ShapeMeasurement {
  index: number;
  identity: string;
  what: string;
  ratio: number;
  paint: string;
  behind: string;
  size: string;
}

const format = (c: Rgb) => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;

/**
 * Mermaid mixes generated ids into its class names (`commit 5-6a47042 commit0`), so the identity
 * used to pair a shape across the two color modes has to drop anything that looks generated.
 */
const identify = (element: Element, index: number) => {
  const classes = (element.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter((name) => name && !/\d-[0-9a-f]{6,}/.test(name))
    .join(' ');

  return `${index}:${element.tagName.toLowerCase()}.${classes}`;
};

const measureShapes = (root: Element, surface: Rgb): ShapeMeasurement[] => {
  const shapes = Array.from(root.querySelectorAll(SHAPE_SELECTOR))
    .map((element) => readShape(element, root))
    .filter((shape): shape is PaintedShape => shape !== null);

  return shapes.map((shape, index) => {
    const x = shape.box.left + (shape.box.width / 2);
    const y = shape.box.top + (shape.box.height / 2);
    const backdrop = backdropAt(shapes, index, x, y, surface);

    // A shape is legible when either its body or its outline separates it from the backdrop, and
    // a gradient counts as legible as soon as one of its stops does.
    const candidates: Array<{ paint: Rgb; label: string }> = [
      ...shape.fill.map((paint) => ({ paint, label: 'fill' })),
      ...shape.stroke.map((paint) => ({ paint, label: 'stroke' })),
    ];

    let best = { ratio: 0, paint: surface, label: 'fill' };
    candidates.forEach(({ paint, label }) => {
      const painted = composite(paint, backdrop, shape.blendMode);
      const ratio = contrast(painted, backdrop);
      if (ratio > best.ratio) best = { ratio, paint: painted, label };
    });

    return {
      index,
      identity: identify(shape.element, index),
      what: `${describe(shape.element)} (${best.label})`,
      ratio: Number(best.ratio.toFixed(2)),
      paint: format(best.paint),
      behind: format(backdrop),
      size: `${Math.round(shape.box.width)}×${Math.round(shape.box.height)}px`,
    };
  });
};

const TEXT_SELECTOR = 'text, tspan, foreignObject span, foreignObject p, foreignObject div';

const auditText = (
  root: Element,
  surface: Rgb,
  kind: string,
  mode: MermaidColorMode,
): TextFinding[] => {
  const shapes = Array.from(root.querySelectorAll(SHAPE_SELECTOR))
    .map((element) => readShape(element, root))
    .filter((shape): shape is PaintedShape => shape !== null);

  const findings: TextFinding[] = [];

  root.querySelectorAll(TEXT_SELECTOR).forEach((node) => {
    const label = (node.textContent ?? '').trim();
    if (!label || node.querySelector('tspan, span, p, div')) return;

    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    const style = getComputedStyle(node);
    const isSvgText = node.namespaceURI === 'http://www.w3.org/2000/svg';
    const ink = isSvgText ? (parseColor(style.fill) ?? parseColor(style.color)) : parseColor(style.color);
    if (!ink) return;

    const x = box.left + (box.width / 2);
    const y = box.top + (box.height / 2);
    let backdrop = backdropAt(shapes, shapes.length, x, y, surface);

    // Glyphs drawn on top of their own outline sit on that halo, not on what is behind it.
    const haloWidth = Number.parseFloat(style.strokeWidth || '0');
    const halo = style.paintOrder.startsWith('stroke') && haloWidth >= 2 ? parseColor(style.stroke) : null;
    if (halo) backdrop = composite(halo, backdrop, 'normal');

    // The sequence number sits on a circle painted through a marker, which has no layout box.
    if (node.getAttribute('class') === 'sequenceNumber') {
      const marker = root.querySelector('marker[id$="-sequencenumber"] circle');
      const markerFill = marker ? parseColor(getComputedStyle(marker).fill) : null;
      if (markerFill) backdrop = composite(markerFill, backdrop, 'normal');
    }

    const painted = composite(ink, backdrop, style.mixBlendMode);
    const ratio = contrast(painted, backdrop);
    if (ratio >= MIN_TEXT_RATIO) return;

    findings.push({
      mode,
      kind,
      what: describe(node),
      ratio: Number(ratio.toFixed(2)),
      paint: format(painted),
      behind: format(backdrop),
      sample: label.slice(0, 40),
    });
  });

  return findings;
};

/**
 * A `<style>` that arrives with `innerHTML` is not in effect for `getComputedStyle` right away —
 * mermaid ships every diagram's colors in such a block, so measuring in the same turn reads the
 * presentation attributes and reports `mix-blend-mode: normal` for a sankey flow that is really
 * drawn with `multiply`. Two frames are enough for the style engine to pick the sheets up.
 */
const styleSheetsApplied = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

const renderMode = async (mode: MermaidColorMode) => {
  document.body.dataset.mode = mode;
  const host = document.getElementById('diagrams')!;
  host.innerHTML = '';
  mermaid.initialize(getMermaidConfig(mode));

  const shapes = new Map<string, ShapeMeasurement[]>();
  const text: TextFinding[] = [];
  const failures: Array<{ kind: string; error: string }> = [];
  const rendered: Array<{ kind: string; figure: HTMLElement }> = [];

  for (const { kind, code } of MERMAID_FIXTURES) {
    const figure = document.createElement('figure');
    host.appendChild(figure);

    try {
      const id = `mermaid-${kind}-${mode}`;
      const { svg } = await mermaid.render(id, code);
      figure.innerHTML = withMermaidStyleOverrides(svg, id, mode);
      applyMermaidLabelContrast(figure, mode);
      rendered.push({ kind, figure });
    } catch (error) {
      failures.push({ kind, error: error instanceof Error ? error.message : String(error) });
    }
  }

  await styleSheetsApplied();

  for (const { kind, figure } of rendered) {
    const root = figure.querySelector('svg[id^="mermaid"]');
    if (!root) {
      failures.push({ kind, error: 'kein gerendertes SVG' });
      continue;
    }

    const surface = parseColor(getComputedStyle(figure).backgroundColor)
      ?? { r: 0, g: 0, b: 0, a: 1 };

    shapes.set(kind, measureShapes(root, surface));
    text.push(...auditText(root, surface, kind, mode));
  }

  return { shapes, text, failures };
};

/** Pairs every shape with its counterpart in the other color mode; see {@link VANISHED_RATIO}. */
const compareModes = (
  dark: Map<string, ShapeMeasurement[]>,
  light: Map<string, ShapeMeasurement[]>,
) => {
  const regressions: Array<{
    kind: string;
    key: string;
    what: string;
    vanishesIn: MermaidColorMode;
    ratio: number;
    otherRatio: number;
    paint: string;
    behind: string;
    size: string;
  }> = [];
  const unpaired: string[] = [];

  for (const [kind, darkShapes] of dark) {
    const lightShapes = light.get(kind) ?? [];

    darkShapes.forEach((darkShape, index) => {
      const lightShape = lightShapes[index];

      if (!lightShape || lightShape.identity !== darkShape.identity) {
        unpaired.push(`${kind} #${index} (${darkShape.identity})`);
        return;
      }

      const [worse, better] = darkShape.ratio <= lightShape.ratio
        ? [darkShape, lightShape]
        : [lightShape, darkShape];

      if (worse.ratio >= VANISHED_RATIO || better.ratio < VANISHED_RATIO) return;

      regressions.push({
        kind,
        key: `${kind} · ${worse.identity} · ${worse === darkShape ? 'dark' : 'light'}`,
        what: worse.what,
        vanishesIn: worse === darkShape ? 'dark' : 'light',
        ratio: worse.ratio,
        otherRatio: better.ratio,
        paint: worse.paint,
        behind: worse.behind,
        size: worse.size,
      });
    });
  }

  return { regressions, unpaired };
};

const collectWcagGap = (
  shapes: Map<string, ShapeMeasurement[]>,
  mode: MermaidColorMode,
) => Array.from(shapes).flatMap(([kind, measurements]) => measurements
  .filter((measurement) => measurement.ratio < MIN_SHAPE_RATIO)
  .map((measurement) => ({ mode, kind, ...measurement })));

const run = async () => {
  const dark = await renderMode('dark');
  const light = await renderMode('light');
  const { regressions, unpaired } = compareModes(dark.shapes, light.shapes);

  return {
    diagrams: MERMAID_FIXTURES.length * 2,
    shapesMeasured: Array.from(dark.shapes.values()).reduce((sum, s) => sum + s.length, 0)
      + Array.from(light.shapes.values()).reduce((sum, s) => sum + s.length, 0),
    regressions: regressions.sort((a, b) => a.ratio - b.ratio),
    text: [...dark.text, ...light.text].sort((a, b) => a.ratio - b.ratio),
    wcagGap: [...collectWcagGap(dark.shapes, 'dark'), ...collectWcagGap(light.shapes, 'light')]
      .sort((a, b) => a.ratio - b.ratio),
    unpaired,
    failures: [...dark.failures, ...light.failures],
  };
};

run()
  .then((report) => fetch('/__mermaid-audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(report),
  }))
  .catch((error: unknown) => fetch('/__mermaid-audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ crashed: error instanceof Error ? error.stack : String(error) }),
  }));
