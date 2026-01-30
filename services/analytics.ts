
import { supabase } from './supabase';

const SESSION_ID_KEY = 'blog_session_id';

const getSessionId = () => {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

export const trackEvent = async (type: string, targetId?: string, metadata: any = {}) => {
  try {
    const sessionId = getSessionId();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if user is logged in for metadata
    const analyticsPayload = {
      event_type: type,
      target_id: targetId,
      session_id: sessionId,
      user_id: session?.user?.id || null,
      metadata: {
        ...metadata,
        url: window.location.href,
        referrer: document.referrer || 'direct',
        screen_size: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent
      }
    };

    const { error } = await supabase.from('site_analytics').insert(analyticsPayload);
    if (error && error.code === '42P01') {
       // Table doesn't exist yet, ignore silently to prevent crash
       return;
    }
  } catch (err) {
    // Fail silently in development/setup phase
    console.debug('Analytics capture skipped');
  }
};

export const startHeartbeat = () => {
  trackEvent('heartbeat');
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      trackEvent('heartbeat');
    }
  }, 30000);
  return () => clearInterval(interval);
};
