/**
 * Merges the raw content of the tag input field into the already collected tags.
 * The input may contain several tags separated by comma or semicolon.
 * Existing tags are kept in order, duplicates are ignored.
 */
export function mergeTagInput(tags: string[], tagInput: string): string[] {
  if (!tagInput.trim()) return tags;

  const newTagsList = tagInput
    .split(/[,;]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const updatedTags = [...tags];
  newTagsList.forEach(newTag => {
    if (!updatedTags.includes(newTag)) {
      updatedTags.push(newTag);
    }
  });

  return updatedTags;
}
