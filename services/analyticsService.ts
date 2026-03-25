/**
 * DeltaPress Analytics Service
 * 
 * Comprehensive analytics tracking for:
 * - User Analytics (who your users are)
 * - Behavior Analytics (what users do)
 * - Article Analytics (content performance)
 * - Traffic & Acquisition
 * 
 * @version 1.8.0
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface UserAnalytics {
  // User identification
  userId?: string;
  anonymousId: string;
  
  // Location data
  ip: string;
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  
  // Device info
  deviceType: 'mobile' | 'desktop' | 'tablet';
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  
  // Session data
  sessionId: string;
  isFirstVisit: boolean;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  
  // Account info
  isLoggedIn: boolean;
  accountCreated?: Date;
  subscriptionStatus?: 'free' | 'basic' | 'premium' | 'enterprise';
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  userId?: string;
  anonymousId: string;
  timestamp: Date;
  type: EventType;
  data: Record<string, any>;
}

export type EventType = 
  // Page events
  | 'page_view'
  | 'page_exit'
  | 'page_scroll'
  | 'page_click'
  
  // Article events
  | 'article_view'
  | 'article_read'
  | 'article_share'
  | 'article_like'
  | 'article_comment'
  | 'article_save'
  | 'article_bounce'
  
  // Search events
  | 'search'
  | 'search_result_click'
  | 'search_no_results'
  
  // User events
  | 'user_signup'
  | 'user_login'
  | 'user_logout'
  | 'user_subscribe'
  | 'user_churn'
  
  // Interaction events
  | 'cta_click'
  | 'menu_click'
  | 'nav_click'
  | 'back_button'
  | 'external_link'
  | 'download'
  | 'error'
  
  // Session events
  | 'session_start'
  | 'session_end'
  | 'session_idle'
  | 'session_extend';

export interface PageView {
  id: string;
  sessionId: string;
  path: string;
  title: string;
  referrer: string;
  timestamp: Date;
  exitTimestamp?: Date;
  timeOnPage: number;
  scrollDepth: number;
  isBounce: boolean;
  isEntry: boolean;
  isExit: boolean;
}

export interface ArticleMetrics {
  articleId: string;
  title: string;
  author: string;
  category: string;
  tags: string[];
  
  // View metrics
  views: number;
  uniqueViews: number;
  avgReadTime: number;
  completionRate: number;
  bounceRate: number;
  
  // Engagement metrics
  shares: number;
  likes: number;
  comments: number;
  saves: number;
  
  // Performance
  readToViewRatio: number;
  headlineCtr: number;
  featuredImageCtr: number;
  
  // Timing
  publishedAt: Date;
  firstViewAt?: Date;
  lastViewAt?: Date;
}

export interface SessionMetrics {
  sessionId: string;
  userId?: string;
  anonymousId: string;
  
  startTime: Date;
  endTime?: Date;
  duration: number;
  
  pageViews: number;
  articleViews: number;
  
  entryPage: string;
  exitPage?: string;
  
  bounce: boolean;
  scrollDepthAvg: number;
  
  device: UserAnalytics;
  
  events: SessionEvent[];
}

export interface DailyMetrics {
  date: string;
  
  // Users
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  activeUsers: number;
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  
  // Sessions
  totalSessions: number;
  avgSessionDuration: number;
  avgPagesPerSession: number;
  bounceRate: number;
  
  // Engagement
  pageViews: number;
  articleViews: number;
  articleReads: number;
  
  // Traffic
  organicTraffic: number;
  directTraffic: number;
  referralTraffic: number;
  socialTraffic: number;
  
  // Retention
  retentionRate: number;
  churnRate: number;
  userGrowthRate: number;
  
  // Revenue (if applicable)
  revenue?: number;
  subscriptions?: number;
  ltv?: number; // Lifetime Value
}

export interface TrafficSource {
  source: string;
  medium: string;
  campaign?: string;
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
  pagesPerSession: number;
  conversions: number;
  conversionRate: number;
}

export interface GeographicData {
  country: string;
  region?: string;
  city?: string;
  users: number;
  sessions: number;
  pageViews: number;
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// Analytics Store (In-Memory for development, replace with database)
// ============================================================================

class AnalyticsStore {
  private sessions: Map<string, SessionMetrics> = new Map();
  private events: SessionEvent[] = [];
  private pageViews: PageView[] = [];
  private articleMetrics: Map<string, ArticleMetrics> = new Map();
  private dailyMetrics: Map<string, DailyMetrics> = new Map();
  private trafficSources: Map<string, TrafficSource> = new Map();
  private geographicData: Map<string, GeographicData> = new Map();
  private users: Map<string, UserAnalytics> = new Map();
  
  // Sessions
  addSession(session: SessionMetrics): void {
    this.sessions.set(session.sessionId, session);
  }
  
  getSession(sessionId: string): SessionMetrics | undefined {
    return this.sessions.get(sessionId);
  }
  
  updateSession(sessionId: string, updates: Partial<SessionMetrics>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, { ...session, ...updates });
    }
  }
  
  // Events
  addEvent(event: SessionEvent): void {
    this.events.push(event);
    
    // Also add to session
    const session = this.sessions.get(event.sessionId);
    if (session) {
      session.events.push(event);
    }
  }
  
  getEvents(filter?: { sessionId?: string; type?: EventType; startDate?: Date; endDate?: Date }): SessionEvent[] {
    return this.events.filter(e => {
      if (filter?.sessionId && e.sessionId !== filter.sessionId) return false;
      if (filter?.type && e.type !== filter.type) return false;
      if (filter?.startDate && e.timestamp < filter.startDate) return false;
      if (filter?.endDate && e.timestamp > filter.endDate) return false;
      return true;
    });
  }
  
  // Page Views
  addPageView(pageView: PageView): void {
    this.pageViews.push(pageView);
  }
  
  getPageViews(filter?: { path?: string; sessionId?: string }): PageView[] {
    return this.pageViews.filter(pv => {
      if (filter?.path && pv.path !== filter.path) return false;
      if (filter?.sessionId && pv.sessionId !== filter.sessionId) return false;
      return true;
    });
  }
  
  // Article Metrics
  updateArticleMetrics(articleId: string, updates: Partial<ArticleMetrics>): void {
    const existing = this.articleMetrics.get(articleId);
    if (existing) {
      this.articleMetrics.set(articleId, { ...existing, ...updates });
    } else {
      this.articleMetrics.set(articleId, updates as ArticleMetrics);
    }
  }
  
  getArticleMetrics(articleId?: string): ArticleMetrics | ArticleMetrics[] {
    if (articleId) {
      return this.articleMetrics.get(articleId);
    }
    return Array.from(this.articleMetrics.values());
  }
  
  // Daily Metrics
  setDailyMetrics(date: string, metrics: DailyMetrics): void {
    this.dailyMetrics.set(date, metrics);
  }
  
  getDailyMetrics(startDate: string, endDate: string): DailyMetrics[] {
    const results: DailyMetrics[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const metrics = this.dailyMetrics.get(dateStr);
      if (metrics) {
        results.push(metrics);
      }
    }
    
    return results;
  }
  
  // Traffic Sources
  updateTrafficSource(key: string, updates: Partial<TrafficSource>): void {
    const existing = this.trafficSources.get(key);
    if (existing) {
      this.trafficSources.set(key, { ...existing, ...updates });
    } else {
      this.trafficSources.set(key, updates as TrafficSource);
    }
  }
  
  getTrafficSources(): TrafficSource[] {
    return Array.from(this.trafficSources.values());
  }
  
  // Geographic Data
  updateGeographicData(key: string, updates: Partial<GeographicData>): void {
    const existing = this.geographicData.get(key);
    if (existing) {
      this.geographicData.set(key, { ...existing, ...updates });
    } else {
      this.geographicData.set(key, updates as GeographicData);
    }
  }
  
  getGeographicData(): GeographicData[] {
    return Array.from(this.geographicData.values());
  }
  
  // Users
  setUser(anonymousId: string, user: UserAnalytics): void {
    this.users.set(anonymousId, user);
  }
  
  getUser(anonymousId: string): UserAnalytics | undefined {
    return this.users.get(anonymousId);
  }
  
  getUsers(): UserAnalytics[] {
    return Array.from(this.users.values());
  }
  
  // Aggregation
  aggregateMetrics(): any {
    const totalSessions = this.sessions.size;
    const totalUsers = this.users.size;
    const totalPageViews = this.pageViews.length;
    const totalEvents = this.events.length;
    
    const avgSessionDuration = totalSessions > 0
      ? Array.from(this.sessions.values()).reduce((sum, s) => sum + s.duration, 0) / totalSessions
      : 0;
    
    const bounceRate = totalSessions > 0
      ? (Array.from(this.sessions.values()).filter(s => s.bounce).length / totalSessions) * 100
      : 0;
    
    return {
      totalSessions,
      totalUsers,
      totalPageViews,
      totalEvents,
      avgSessionDuration,
      bounceRate
    };
  }
}

// ============================================================================
// Analytics Service
// ============================================================================

export class AnalyticsService {
  private store: AnalyticsStore;
  
  constructor() {
    this.store = new AnalyticsStore();
  }
  
  // ========================================================================
  // Session Management
  // ========================================================================
  
  /**
   * Start a new session
   */
  startSession(userAnalytics: UserAnalytics): string {
    const sessionId = this.generateId();
    
    const session: SessionMetrics = {
      sessionId,
      userId: userAnalytics.userId,
      anonymousId: userAnalytics.anonymousId,
      startTime: new Date(),
      duration: 0,
      pageViews: 0,
      articleViews: 0,
      entryPage: '',
      bounce: false,
      scrollDepthAvg: 0,
      device: userAnalytics,
      events: []
    };
    
    this.store.addSession(session);
    this.store.setUser(userAnalytics.anonymousId, userAnalytics);
    
    // Track session start event
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId: userAnalytics.userId,
      anonymousId: userAnalytics.anonymousId,
      timestamp: new Date(),
      type: 'session_start',
      data: { referrer: userAnalytics.referrer }
    });
    
    // Update traffic source
    this.updateTrafficSource(userAnalytics);
    
    // Update geographic data
    this.updateGeographicData(userAnalytics);
    
    return sessionId;
  }
  
  /**
   * End a session
   */
  endSession(sessionId: string): void {
    const session = this.store.getSession(sessionId);
    if (!session) return;
    
    const endTime = new Date();
    const duration = endTime.getTime() - session.startTime.getTime();
    
    // Determine if bounce (single page view)
    const bounce = session.pageViews === 1;
    
    // Update session
    this.store.updateSession(sessionId, {
      endTime,
      duration,
      bounce
    });
    
    // Track session end event
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId: session.userId,
      anonymousId: session.anonymousId,
      timestamp: endTime,
      type: 'session_end',
      data: { duration, bounce }
    });
    
    // Update daily metrics
    this.updateDailyMetrics(new Date(), {
      totalSessions: 1,
      avgSessionDuration: duration,
      bounceRate: bounce ? 100 : 0
    });
  }
  
  // ========================================================================
  // Event Tracking
  // ========================================================================
  
  /**
   * Track an event
   */
  trackEvent(event: SessionEvent): void {
    this.store.addEvent(event);
  }
  
  /**
   * Track page view
   */
  trackPageView(
    sessionId: string,
    path: string,
    title: string,
    referrer: string
  ): string {
    const pageViewId = this.generateId();
    
    const pageView: PageView = {
      id: pageViewId,
      sessionId,
      path,
      title,
      referrer,
      timestamp: new Date(),
      timeOnPage: 0,
      scrollDepth: 0,
      isBounce: false,
      isEntry: false,
      isExit: false
    };
    
    // Check if entry page
    const session = this.store.getSession(sessionId);
    if (session && session.pageViews === 0) {
      pageView.isEntry = true;
      this.store.updateSession(sessionId, { entryPage: path });
    }
    
    this.store.addPageView(pageView);
    this.store.updateSession(sessionId, { 
      pageViews: (session?.pageViews || 0) + 1 
    });
    
    // Track event
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId: session?.userId,
      anonymousId: session?.anonymousId || '',
      timestamp: new Date(),
      type: 'page_view',
      data: { path, title, referrer }
    });
    
    return pageViewId;
  }
  
  /**
   * Track article view
   */
  trackArticleView(
    sessionId: string,
    articleId: string,
    title: string,
    author: string,
    category: string
  ): void {
    const session = this.store.getSession(sessionId);
    
    // Update session
    this.store.updateSession(sessionId, {
      articleViews: (session?.articleViews || 0) + 1
    });
    
    // Update article metrics
    const existing = this.store.getArticleMetrics(articleId) as ArticleMetrics;
    this.store.updateArticleMetrics(articleId, {
      articleId,
      title,
      author,
      category,
      views: (existing?.views || 0) + 1,
      uniqueViews: (existing?.uniqueViews || 0) + (session?.isFirstVisit ? 1 : 0),
      firstViewAt: existing?.firstViewAt || new Date(),
      lastViewAt: new Date()
    });
    
    // Track event
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId: session?.userId,
      anonymousId: session?.anonymousId || '',
      timestamp: new Date(),
      type: 'article_view',
      data: { articleId, title, author, category }
    });
  }
  
  /**
   * Track article read completion
   */
  trackArticleRead(
    sessionId: string,
    articleId: string,
    readTime: number,
    completionPercent: number
  ): void {
    const session = this.store.getSession(sessionId);
    
    // Update article metrics
    const existing = this.store.getArticleMetrics(articleId) as ArticleMetrics;
    if (existing) {
      const totalReads = (existing.views || 0);
      const avgReadTime = existing.avgReadTime 
        ? (existing.avgReadTime * (totalReads - 1) + readTime) / totalReads
        : readTime;
      
      this.store.updateArticleMetrics(articleId, {
        avgReadTime,
        completionRate: completionPercent
      });
    }
    
    // Track event
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId: session?.userId,
      anonymousId: session?.anonymousId || '',
      timestamp: new Date(),
      type: 'article_read',
      data: { articleId, readTime, completionPercent }
    });
  }
  
  /**
   * Track scroll depth
   */
  trackScrollDepth(sessionId: string, path: string, depth: number): void {
    const session = this.store.getSession(sessionId);
    
    // Track event
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId: session?.userId,
      anonymousId: session?.anonymousId || '',
      timestamp: new Date(),
      type: 'page_scroll',
      data: { path, depth }
    });
  }
  
  /**
   * Track search
   */
  trackSearch(sessionId: string, query: string, resultsCount: number): void {
    const session = this.store.getSession(sessionId);
    
    // Track event
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId: session?.userId,
      anonymousId: session?.anonymousId || '',
      timestamp: new Date(),
      type: resultsCount > 0 ? 'search' : 'search_no_results',
      data: { query, resultsCount }
    });
  }
  
  /**
   * Track CTA click
   */
  trackCtaClick(sessionId: string, ctaId: string, ctaText: string, location: string): void {
    const session = this.store.getSession(sessionId);
    
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId: session?.userId,
      anonymousId: session?.anonymousId || '',
      timestamp: new Date(),
      type: 'cta_click',
      data: { ctaId, ctaText, location }
    });
  }
  
  /**
   * Track share
   */
  trackShare(sessionId: string, articleId: string, platform: string): void {
    const session = this.store.getSession(sessionId);
    
    // Update article metrics
    const existing = this.store.getArticleMetrics(articleId) as ArticleMetrics;
    if (existing) {
      this.store.updateArticleMetrics(articleId, {
        shares: (existing.shares || 0) + 1
      });
    }
    
    // Track event
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId: session?.userId,
      anonymousId: session?.anonymousId || '',
      timestamp: new Date(),
      type: 'article_share',
      data: { articleId, platform }
    });
  }
  
  // ========================================================================
  // User Management
  // ========================================================================
  
  /**
   * Identify user (after login)
   */
  identifyUser(anonymousId: string, userId: string, traits: Partial<UserAnalytics>): void {
    const existing = this.store.getUser(anonymousId);
    if (existing) {
      this.store.setUser(anonymousId, { 
        ...existing, 
        userId, 
        isLoggedIn: true,
        ...traits 
      });
    }
  }
  
  /**
   * Track user signup
   */
  trackSignup(sessionId: string, userId: string, source: string): void {
    const session = this.store.getSession(sessionId);
    
    this.trackEvent({
      id: this.generateId(),
      sessionId,
      userId,
      anonymousId: session?.anonymousId || '',
      timestamp: new Date(),
      type: 'user_signup',
      data: { source }
    });
  }
  
  // ========================================================================
  // Reporting
  // ========================================================================
  
  /**
   * Get overview metrics
   */
  getOverview(): any {
    return this.store.aggregateMetrics();
  }
  
  /**
   * Get user analytics
   */
  getUserAnalytics(): UserAnalytics[] {
    return this.store.getUsers();
  }
  
  /**
   * Get behavior analytics
   */
  getBehaviorAnalytics(startDate?: Date, endDate?: Date): any {
    const events = this.store.getEvents({ startDate, endDate });
    
    // Aggregate behavior metrics
    const pageViews = events.filter(e => e.type === 'page_view');
    const articleViews = events.filter(e => e.type === 'article_view');
    const searches = events.filter(e => e.type === 'search');
    const ctaClicks = events.filter(e => e.type === 'cta_click');
    const bounces = events.filter(e => e.type === 'article_bounce');
    
    // Calculate metrics
    const sessions = new Set(events.map(e => e.sessionId)).size;
    const avgScrollDepth = this.calculateAverage(
      events.filter(e => e.type === 'page_scroll').map(e => e.data.depth as number)
    );
    
    return {
      totalEvents: events.length,
      pageViews: pageViews.length,
      articleViews: articleViews.length,
      searches: searches.length,
      ctaClicks: ctaClicks.length,
      bounces: bounces.length,
      sessions,
      avgScrollDepth,
      
      // Entry/Exit pages
      entryPages: this.getTopPages('entry'),
      exitPages: this.getTopPages('exit'),
      
      // Navigation paths
      navigationPaths: this.getNavigationPaths(),
      
      // Search queries
      topSearches: this.getTopSearches()
    };
  }
  
  /**
   * Get article analytics
   */
  getArticleAnalytics(articleId?: string): ArticleMetrics | ArticleMetrics[] {
    return this.store.getArticleMetrics(articleId);
  }
  
  /**
   * Get traffic analytics
   */
  getTrafficAnalytics(): TrafficSource[] {
    return this.store.getTrafficSources();
  }
  
  /**
   * Get geographic analytics
   */
  getGeographicAnalytics(): GeographicData[] {
    return this.store.getGeographicData();
  }
  
  /**
   * Get daily metrics
   */
  getDailyMetrics(startDate: string, endDate: string): DailyMetrics[] {
    return this.store.getDailyMetrics(startDate, endDate);
  }
  
  /**
   * Get real-time analytics
   */
  getRealtimeAnalytics(): any {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const recentEvents = this.store.getEvents({ 
      startDate: fiveMinutesAgo,
      endDate: now 
    });
    
    const activeSessions = new Set(recentEvents.map(e => e.sessionId)).size;
    const activeUsers = new Set(recentEvents.map(e => e.userId || e.anonymousId)).size;
    
    return {
      activeUsers,
      activeSessions,
      eventsLast5Min: recentEvents.length,
      pageViewsLast5Min: recentEvents.filter(e => e.type === 'page_view').length,
      topPages: this.getTopPages('current'),
      topCountries: this.getTopCountries(5)
    };
  }
  
  // ========================================================================
  // Helper Methods
  // ========================================================================
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
  
  private updateTrafficSource(user: UserAnalytics): void {
    let source = 'direct';
    let medium = 'none';
    let campaign = '';
    
    if (user.utmSource) {
      source = user.utmSource;
      medium = user.utmMedium || 'unknown';
      campaign = user.utmCampaign || '';
    } else if (user.referrer) {
      try {
        const referrerUrl = new URL(user.referrer);
        if (referrerUrl.hostname.includes('google') || referrerUrl.hostname.includes('bing')) {
          source = 'organic';
          medium = 'search';
        } else if (referrerUrl.hostname.includes('facebook') || 
                   referrerUrl.hostname.includes('twitter') ||
                   referrerUrl.hostname.includes('linkedin')) {
          source = referrerUrl.hostname.replace('www.', '');
          medium = 'social';
        } else {
          source = referrerUrl.hostname;
          medium = 'referral';
        }
      } catch {}
    }
    
    const key = `${source}:${medium}:${campaign}`;
    const existing = this.store.getTrafficSources().find(
      ts => ts.source === source && ts.medium === medium
    );
    
    this.store.updateTrafficSource(key, {
      source,
      medium,
      campaign,
      sessions: (existing?.sessions || 0) + 1,
      users: (existing?.users || 0) + 1,
      newUsers: (existing?.newUsers || 0) + (user.isFirstVisit ? 1 : 0)
    });
  }
  
  private updateGeographicData(user: UserAnalytics): void {
    const key = `${user.country}:${user.region}:${user.city}`;
    const existing = this.store.getGeographicData().find(
      gd => gd.country === user.country && gd.city === user.city
    );
    
    this.store.updateGeographicData(key, {
      country: user.country,
      region: user.region,
      city: user.city,
      latitude: user.latitude,
      longitude: user.longitude,
      users: (existing?.users || 0) + 1,
      sessions: (existing?.sessions || 0) + 1
    });
  }
  
  private updateDailyMetrics(date: Date, updates: Partial<DailyMetrics>): void {
    const dateStr = date.toISOString().split('T')[0];
    const existing = this.store.getDailyMetrics(dateStr, dateStr)[0];
    
    this.store.setDailyMetrics(dateStr, {
      date: dateStr,
      totalUsers: (existing?.totalUsers || 0) + (updates.totalUsers || 0),
      newUsers: (existing?.newUsers || 0) + (updates.newUsers || 0),
      returningUsers: (existing?.returningUsers || 0) + (updates.returningUsers || 0),
      activeUsers: (existing?.activeUsers || 0) + (updates.activeUsers || 0),
      dau: (existing?.dau || 0) + 1,
      totalSessions: (existing?.totalSessions || 0) + (updates.totalSessions || 0),
      pageViews: (existing?.pageViews || 0) + (updates.pageViews || 0),
      articleViews: (existing?.articleViews || 0) + (updates.articleViews || 0),
      bounceRate: updates.bounceRate || existing?.bounceRate || 0,
      retentionRate: existing?.retentionRate || 0,
      churnRate: existing?.churnRate || 0,
      userGrowthRate: existing?.userGrowthRate || 0
    } as DailyMetrics);
  }
  
  private getTopPages(type: 'entry' | 'exit' | 'current'): Array<{ path: string; count: number }> {
    const pageViews = this.store.getPageViews();
    const pathCounts = new Map<string, number>();
    
    pageViews.forEach(pv => {
      const include = type === 'entry' ? pv.isEntry : 
                      type === 'exit' ? pv.isExit : 
                      true;
      if (include) {
        pathCounts.set(pv.path, (pathCounts.get(pv.path) || 0) + 1);
      }
    });
    
    return Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  private getTopSearches(): Array<{ query: string; count: number }> {
    const searchEvents = this.store.getEvents({ type: 'search' });
    const queryCounts = new Map<string, number>();
    
    searchEvents.forEach(e => {
      const query = e.data.query as string;
      if (query) {
        queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
      }
    });
    
    return Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  private getNavigationPaths(): Array<{ from: string; to: string; count: number }> {
    // Simplified navigation path tracking
    return [];
  }
  
  private getTopCountries(limit: number): Array<{ country: string; users: number }> {
    const geo = this.store.getGeographicData();
    
    const countryCounts = new Map<string, number>();
    geo.forEach(g => {
      countryCounts.set(g.country, (countryCounts.get(g.country) || 0) + g.users);
    });
    
    return Array.from(countryCounts.entries())
      .map(([country, users]) => ({ country, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, limit);
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
