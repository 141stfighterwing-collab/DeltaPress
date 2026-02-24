
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
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
};

/**
 * Basic SQL Injection check for raw strings.
 * Supabase client handles this by default, but this is useful for raw RPC calls.
 */
export const isPotentiallySqlInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /DROP\s+TABLE/i,
    /DELETE\s+FROM/i,
    /UPDATE\s+.*SET/i,
    /INSERT\s+INTO/i,
  ];
  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Escapes HTML special characters to prevent XSS in plain text contexts.
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Robustly extracts a YouTube video ID from various URL formats.
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Normalizes all <iframe> tags in a block of HTML to a canonical, responsive format.
 * Primarily handles YouTube links to ensure they work reliably.
 */
export const normalizeYouTubeEmbeds = (html: string): string => {
  if (!html) return '';
  
  // Find raw iframes and check if they are YouTube. If they are, wrap them and fix the URL.
  return html.replace(/<iframe\b[^>]*src=(['"])([^'"]+)\1[^>]*><\/iframe>/gim, (fullMatch, _quote, src) => {
    const videoId = extractYouTubeVideoId(src);
    if (!videoId) return fullMatch;
    
    return `<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  });
};

/**
 * Basic HTML Sanitizer to prevent XSS.
 * Removes <script>, <object>, <embed>, and inline event handlers.
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  const sanitized = html
    // Remove script tags and their content
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    // Remove inline event handlers (onclick, onmouseover, etc.)
    .replace(/\s+on\w+="[^"]*"/g, "")
    .replace(/\s+on\w+='[^']*'/g, "")
    // Remove javascript: pseudo-protocol in links
    .replace(/href\s*=\s*(['"])javascript:[^'"]*\1/gim, "href=$1#$1")
    // Remove potentially dangerous tags unless they are from trusted media providers
    .replace(/<(meta|link|iframe|embed|object)\b[^>]*>/gim, (match) => {
      const lower = match.toLowerCase();
      // Explicitly allow safe iframes with common video/audio patterns
      if (
        lower.includes('youtube.com') || 
        lower.includes('youtube-nocookie.com') ||
        lower.includes('youtu.be') ||
        lower.includes('spotify.com') || 
        lower.includes('soundcloud.com')
      ) {
        return match;
      }
      return "";
    });

  return normalizeYouTubeEmbeds(sanitized);
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

/**
 * Validates password strength.
 * Requires min 8 chars, 1 uppercase, 1 lowercase, 1 number.
 */
export const getPasswordStrength = (password: string): { score: number, feedback: string } => {
  if (!password) return { score: 0, feedback: 'Password is required' };
  if (password.length < LIMITS.PASSWORD_MIN) return { score: 1, feedback: `Minimum ${LIMITS.PASSWORD_MIN} characters` };
  
  let score = 0;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score < 3) return { score: 2, feedback: 'Weak: Add numbers or symbols' };
  if (score === 3) return { score: 3, feedback: 'Medium' };
  return { score: 4, feedback: 'Strong' };
};

/**
 * Generic input validator.
 */
export const validateInput = (value: string, type: 'email' | 'url' | 'slug' | 'text', maxLength?: number): { valid: boolean, error?: string } => {
  if (!value) return { valid: false, error: 'Field is required' };
  if (maxLength && value.length > maxLength) return { valid: false, error: `Maximum ${maxLength} characters exceeded` };
  
  switch (type) {
    case 'email':
      return isValidEmail(value) ? { valid: true } : { valid: false, error: 'Invalid email format' };
    case 'url':
      return isValidUrl(value) ? { valid: true } : { valid: false, error: 'Invalid URL format' };
    case 'slug':
      const clean = cleanSlug(value);
      return clean === value ? { valid: true } : { valid: false, error: 'Slug contains invalid characters' };
    default:
      if (isPotentiallySqlInjection(value)) return { valid: false, error: 'Invalid characters detected' };
      return { valid: true };
  }
};
