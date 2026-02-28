
import { supabase } from './supabase';

const SESSION_ID_KEY = 'blog_session_id';
const IP_DATA_KEY = 'blog_ip_data';

const getSessionId = () => {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

let ipDataPromise: Promise<any> | null = null;

const getIpData = async () => {
  let cached = sessionStorage.getItem(IP_DATA_KEY);
  if (cached) return JSON.parse(cached);

  if (ipDataPromise) {
    return ipDataPromise;
  }

  ipDataPromise = (async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem(IP_DATA_KEY, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.debug('IP fetch failed');
    } finally {
      ipDataPromise = null;
    }
    return null;
  })();

  return ipDataPromise;
};

export const trackEvent = async (type: string, targetId?: string, metadata: any = {}) => {
  try {
    const sessionId = getSessionId();
    const [ipData, { data: { session } }] = await Promise.all([
      getIpData(),
      supabase.auth.getSession()
    ]);
    
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
        userAgent: navigator.userAgent,
        ip: ipData?.ip || 'unknown',
        location: ipData ? `${ipData.city}, ${ipData.country_name}` : 'unknown'
      }
    };

    const { error } = await supabase.from('site_analytics').insert(analyticsPayload);
    if (error && error.code === '42P01') {
       return;
    }
  } catch (err) {
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
