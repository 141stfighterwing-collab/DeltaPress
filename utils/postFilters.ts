const SEEDED_TITLE_PATTERN = /^seeded\s+post\b/i;
const SEEDED_CONTENT_PATTERN = /^content\s+for\s+seeded\s+post\b/i;

export const isSeededPost = (post: { title?: string | null; content?: string | null }): boolean => {
  const title = (post.title || '').trim();
  const content = (post.content || '').trim();
  return SEEDED_TITLE_PATTERN.test(title) || SEEDED_CONTENT_PATTERN.test(content);
};
