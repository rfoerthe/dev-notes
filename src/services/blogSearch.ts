import type { BlogPost } from './blogService';

const QUOTE_CHARS = ['"', '“', '”', '„', '«', '»'];

type ParsedSearchQuery = {
  term: string;
  isExactPhrase: boolean;
};

function isQuoteChar(value: string | undefined): boolean {
  return value !== undefined && QUOTE_CHARS.includes(value);
}

function normalizeSearchQuery(searchQuery: string): string {
  return searchQuery.trim().toLocaleLowerCase('de-DE');
}

function parseSearchQuery(searchQuery: string): ParsedSearchQuery {
  const trimmedSearchQuery = searchQuery.trim();

  if (!trimmedSearchQuery) {
    return { term: '', isExactPhrase: false };
  }

  const startsQuoted = isQuoteChar(trimmedSearchQuery.at(0));
  const endsQuoted = isQuoteChar(trimmedSearchQuery.at(-1));

  if (!startsQuoted && !endsQuoted) {
    return { term: normalizeSearchQuery(trimmedSearchQuery), isExactPhrase: false };
  }

  let phraseStart = 0;
  let phraseEnd = trimmedSearchQuery.length;

  while (phraseStart < phraseEnd && isQuoteChar(trimmedSearchQuery.at(phraseStart))) {
    phraseStart += 1;
  }

  while (phraseEnd > phraseStart && isQuoteChar(trimmedSearchQuery.at(phraseEnd - 1))) {
    phraseEnd -= 1;
  }

  return {
    term: normalizeSearchQuery(trimmedSearchQuery.slice(phraseStart, phraseEnd)),
    isExactPhrase: true
  };
}

function normalizeSearchableValue(value: string): string {
  return value.toLocaleLowerCase('de-DE');
}

function fieldMatchesSearch(value: string, term: string, isExactPhrase: boolean): boolean {
  const normalizedValue = normalizeSearchableValue(value);

  if (isExactPhrase) {
    return normalizedValue.includes(term);
  }

  return normalizedValue.includes(term);
}

export function blogMatchesSearch(blog: BlogPost, searchQuery: string): boolean {
  const { term, isExactPhrase } = parseSearchQuery(searchQuery);

  if (!term) {
    return true;
  }

  return [
    blog.title,
    blog.summary,
    blog.content,
    blog.authorName,
    blog.authorUsername || ''
  ].some(value => fieldMatchesSearch(value, term, isExactPhrase));
}
