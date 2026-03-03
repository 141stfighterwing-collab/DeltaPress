const SEEDED_TITLE_PATTERN = /seeded\s+post/i;
const SEEDED_CONTENT_PATTERN = /content\s+for\s+seeded\s+post/i;
const PLACEHOLDER_TITLE_PATTERN = /^post\s+\d+(?:\s+\d+)?$/i;

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

export const htmlToPlainText = (html?: string | null): string => {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const extractFirstImageFromContent = (html?: string | null): string | null => {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
};

export const getDisplayTitle = (post: { title?: string | null; content?: string | null }, fallback = 'Untitled Story'): string => {
  const rawTitle = (post.title || '').trim();
  if (rawTitle && !PLACEHOLDER_TITLE_PATTERN.test(rawTitle)) return rawTitle;

  const headingMatch = (post.content || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (headingMatch?.[1]) {
    const headingText = htmlToPlainText(headingMatch[1]);
    if (headingText) return headingText;
  }

  const previewText = htmlToPlainText(post.content);
  if (previewText) return previewText.split(/[.!?]/)[0].trim().slice(0, 110);

  return fallback;
};

export const getExcerptFromContent = (content?: string | null, maxLength = 220): string => {
  const plainText = htmlToPlainText(content);
  if (!plainText) return '';
  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, maxLength).trimEnd()}...`;
};
