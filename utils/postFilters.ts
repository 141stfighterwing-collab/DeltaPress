const SEEDED_TITLE_PATTERN = /seeded\s+post/i;
const SEEDED_CONTENT_PATTERN = /content\s+for\s+seeded\s+post/i;

export const isSeededPost = (post: { title?: string | null; content?: string | null }): boolean => {
  const title = (post.title || '').trim();
  const content = (post.content || '').trim();
  return SEEDED_TITLE_PATTERN.test(title) || SEEDED_CONTENT_PATTERN.test(content);
};

export const sanitizeSeededPost = <T extends { title?: string | null; content?: string | null }>(post: T): T => {
  const sanitizedPost = { ...post };
  if (sanitizedPost.title) {
    sanitizedPost.title = sanitizedPost.title.replace(/Seeded\s*Post/i, 'Post').replace(/Seeded/i, '').trim();
  }
  if (sanitizedPost.content) {
    sanitizedPost.content = sanitizedPost.content.replace(/Content\s*for\s*seeded\s*post/i, '').replace(/Seeded/i, '').trim();
  }
  return sanitizedPost;
};
