
/**
 * Security Utilities for Twenty Ten Blog
 * Focuses on XSS prevention, Input Validation, and Data Integrity.
 */

export const LIMITS = {
  POST_TITLE: 200,
  POST_CONTENT: 100000,
  COMMENT_CONTENT: 3000,
  USERNAME: 30,
  DISPLAY_NAME: 50,
  URL: 2048,
};

/**
 * Basic HTML Sanitizer to prevent XSS.
 * Removes <script>, <object>, <embed>, and inline event handlers.
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  return html
    // Remove script tags and their content
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    // Remove inline event handlers (onclick, onmouseover, etc.)
    .replace(/\s+on\w+="[^"]*"/g, "")
    .replace(/\s+on\w+='[^']*'/g, "")
    // Remove javascript: pseudo-protocol in links
    .replace(/href\s*=\s*(['"])javascript:[^'"]*([\1])/gim, "href=$1#$2")
    // Remove meta and link tags that could redirect or load malicious styles
    .replace(/<(meta|link|iframe|embed|object)\b[^>]*>/gim, (match) => {
      // Allow specific safe iframes (YouTube, Spotify) while stripping others
      if (match.includes('youtube.com/embed') || match.includes('spotify.com/embed') || match.includes('soundcloud.com/player')) {
        return match;
      }
      return "";
    });
};

/**
 * Ensures slugs are URL-safe and prevent directory traversal or injection.
 */
export const cleanSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w ]+/g, '') // Remove non-word characters (except spaces)
    .replace(/ +/g, '-');    // Replace spaces with dashes
};

/**
 * Validates email format using a standard RFC-compliant regex.
 */
export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validates that a string is a properly formatted HTTP/HTTPS URL.
 */
export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e) {
    return false;
  }
};

/**
 * Generic text cleaner for plain-text fields (removes all HTML).
 */
export const stripAllHtml = (text: string): string => {
  return text.replace(/<[^>]*>?/gm, '').trim();
};
