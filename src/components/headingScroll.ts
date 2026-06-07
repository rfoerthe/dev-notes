const FALLBACK_NAV_HEIGHT = 72;
const HEADING_SCROLL_GAP = 18;

const getVisibleElementHeight = (selector: string): number => {
  const element = document.querySelector<HTMLElement>(selector);

  if (!element) {
    return 0;
  }

  const styles = window.getComputedStyle(element);

  if (styles.display === 'none' || styles.visibility === 'hidden') {
    return 0;
  }

  return element.getBoundingClientRect().height;
};

export const getHeadingScrollOffset = (): number => {
  const navHeight = getVisibleElementHeight('.glass-nav') || FALLBACK_NAV_HEIGHT;
  const stickyTitleHeight = getVisibleElementHeight('[data-article-sticky-title="true"]');

  return Math.ceil(navHeight + stickyTitleHeight + HEADING_SCROLL_GAP);
};

export const scrollHeadingIntoView = (target: HTMLElement, behavior: ScrollBehavior = 'smooth') => {
  const top = target.getBoundingClientRect().top + window.scrollY - getHeadingScrollOffset();

  window.scrollTo({
    top: Math.max(0, top),
    behavior,
  });
};
