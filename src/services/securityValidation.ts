export const MIN_PASSWORD_LENGTH = 12;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,29}$/;
export const TAG_PATTERN = /^[^<>]{1,40}$/;

export const BLOG_LIMITS = {
  titleMaxLength: 150,
  summaryMaxLength: 600,
  contentMaxLength: 50000,
  maxTags: 10,
  tagMaxLength: 40
} as const;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return 'Der Benutzername muss 3 bis 30 Zeichen lang sein und darf nur Kleinbuchstaben, Zahlen, Bindestriche und Unterstriche enthalten.';
  }

  return null;
}

export function validateEmailAddress(email: string): string | null {
  if (!EMAIL_PATTERN.test(email)) {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }

  return null;
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Das Passwort muss Groß- und Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten.';
  }

  return null;
}

export function sanitizeTags(tags: string[], requireTag = true): string[] {
  const normalizedTags = Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean)));

  if (requireTag && normalizedTags.length === 0) {
    throw new Error('Bitte füge mindestens ein Schlagwort (Tag) hinzu.');
  }

  if (normalizedTags.length > BLOG_LIMITS.maxTags) {
    throw new Error(`Ein Beitrag darf maximal ${BLOG_LIMITS.maxTags} Tags enthalten.`);
  }

  const invalidTag = normalizedTags.find(tag => !TAG_PATTERN.test(tag));
  if (invalidTag) {
    throw new Error(`Das Tag "${invalidTag}" ist ungültig. Tags dürfen maximal ${BLOG_LIMITS.tagMaxLength} Zeichen lang sein und keine spitzen Klammern enthalten.`);
  }

  return normalizedTags;
}

export function validateBlogDraft(title: string, summary: string, content: string, tags: string[]): string[] {
  const errors: string[] = [];

  if (title.trim().length > BLOG_LIMITS.titleMaxLength) {
    errors.push(`Der Titel darf maximal ${BLOG_LIMITS.titleMaxLength} Zeichen lang sein.`);
  }
  if (summary.trim().length > BLOG_LIMITS.summaryMaxLength) {
    errors.push(`Die Zusammenfassung darf maximal ${BLOG_LIMITS.summaryMaxLength} Zeichen lang sein.`);
  }
  if (content.length > BLOG_LIMITS.contentMaxLength) {
    errors.push(`Der Inhalt darf maximal ${BLOG_LIMITS.contentMaxLength} Zeichen lang sein.`);
  }

  try {
    sanitizeTags(tags, false);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Die Tags sind ungültig.');
  }

  return errors;
}

export function validateBlogContent(title: string, summary: string, content: string, tags: string[]): string[] {
  const errors: string[] = [];

  if (!title.trim()) {
    errors.push('Der Titel darf nicht leer sein.');
  } else if (title.trim().length > BLOG_LIMITS.titleMaxLength) {
    errors.push(`Der Titel darf maximal ${BLOG_LIMITS.titleMaxLength} Zeichen lang sein.`);
  }

  if (!summary.trim()) {
    errors.push('Die Zusammenfassung darf nicht leer sein.');
  } else if (summary.trim().length > BLOG_LIMITS.summaryMaxLength) {
    errors.push(`Die Zusammenfassung darf maximal ${BLOG_LIMITS.summaryMaxLength} Zeichen lang sein.`);
  }

  if (!content.trim()) {
    errors.push('Der Inhalt darf nicht leer sein.');
  } else if (content.length > BLOG_LIMITS.contentMaxLength) {
    errors.push(`Der Inhalt darf maximal ${BLOG_LIMITS.contentMaxLength} Zeichen lang sein.`);
  }

  try {
    sanitizeTags(tags);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Die Tags sind ungültig.');
  }

  return errors;
}
