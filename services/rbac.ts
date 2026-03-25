/**
 * Role-Based Access Control (RBAC) Service
 * 
 * Provides centralized permission management for DeltaPress.
 * Supports roles: Admin, Editor, Reviewer, User
 * 
 * @version 1.2.0
 */

// Role definitions with hierarchy
export type UserRole = 'admin' | 'editor' | 'reviewer' | 'user';

export interface RolePermissions {
  canManageUsers: boolean;
  canManagePosts: boolean;
  canManageSettings: boolean;
  canManageAPI: boolean;
  canManageJournalists: boolean;
  canPublishPosts: boolean;
  canDeletePosts: boolean;
  canViewDiagnostics: boolean;
  canViewAnalytics: boolean;
  canManageMedia: boolean;
  canManageSEO: boolean;
  canViewAPIKeys: boolean;
  canEditSiteSettings: boolean;
}

// Role hierarchy - higher number = more permissions
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  editor: 75,
  reviewer: 50,
  user: 25
};

// Permission matrix per role
const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canManageUsers: true,
    canManagePosts: true,
    canManageSettings: true,
    canManageAPI: true,
    canManageJournalists: true,
    canPublishPosts: true,
    canDeletePosts: true,
    canViewDiagnostics: true,
    canViewAnalytics: true,
    canManageMedia: true,
    canManageSEO: true,
    canViewAPIKeys: true,
    canEditSiteSettings: true
  },
  editor: {
    canManageUsers: false,
    canManagePosts: true,
    canManageSettings: false,
    canManageAPI: false,
    canManageJournalists: true,
    canPublishPosts: true,
    canDeletePosts: true,
    canViewDiagnostics: true,
    canViewAnalytics: true,
    canManageMedia: true,
    canManageSEO: true,
    canViewAPIKeys: false,
    canEditSiteSettings: false
  },
  reviewer: {
    canManageUsers: false,
    canManagePosts: false,
    canManageSettings: false,
    canManageAPI: false,
    canManageJournalists: false,
    canPublishPosts: false,
    canDeletePosts: false,
    canViewDiagnostics: true,
    canViewAnalytics: true,
    canManageMedia: false,
    canManageSEO: false,
    canViewAPIKeys: false,
    canEditSiteSettings: false
  },
  user: {
    canManageUsers: false,
    canManagePosts: false,
    canManageSettings: false,
    canManageAPI: false,
    canManageJournalists: false,
    canPublishPosts: false,
    canDeletePosts: false,
    canViewDiagnostics: false,
    canViewAnalytics: false,
    canManageMedia: false,
    canManageSEO: false,
    canViewAPIKeys: false,
    canEditSiteSettings: false
  }
};

/**
 * Get permissions for a specific role
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  const permissions = getRolePermissions(role);
  return permissions[permission] === true;
}

/**
 * Check if user's role is at or above a minimum level
 */
export function hasRoleLevel(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Check if user can access admin panel
 */
export function canAccessAdmin(role: UserRole): boolean {
  return hasRoleLevel(role, 'reviewer');
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(actorRole: UserRole, targetRole: UserRole): boolean {
  // Can't manage users with same or higher role
  if (!hasPermission(actorRole, 'canManageUsers')) return false;
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get role display info
 */
export function getRoleInfo(role: UserRole): { 
  label: string; 
  color: string; 
  bgColor: string;
  description: string;
} {
  const roleInfo = {
    admin: {
      label: 'Administrator',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Full system access including user management, API configuration, and site settings.'
    },
    editor: {
      label: 'Editor',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Can create, edit, and publish content. Can manage journalists and media.'
    },
    reviewer: {
      label: 'Reviewer',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      description: 'Read-only access to admin panel. Can view analytics and diagnostics.'
    },
    user: {
      label: 'User',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      description: 'Standard user with no administrative privileges.'
    }
  };
  
  return roleInfo[role] || roleInfo.user;
}

/**
 * Get all available roles with their info
 */
export function getAllRoles(): Array<{
  id: UserRole;
  level: number;
  info: ReturnType<typeof getRoleInfo>;
  permissions: RolePermissions;
}> {
  return (Object.keys(ROLE_HIERARCHY) as UserRole[]).map(role => ({
    id: role,
    level: ROLE_HIERARCHY[role],
    info: getRoleInfo(role),
    permissions: getRolePermissions(role)
  }));
}

/**
 * Admin API endpoint definitions for RBAC
 */
export const ADMIN_ENDPOINTS = {
  '/admin': { minRole: 'reviewer' as UserRole, description: 'Admin Dashboard' },
  '/admin/analytics': { minRole: 'reviewer' as UserRole, description: 'Analytics View' },
  '/admin/posts': { minRole: 'editor' as UserRole, description: 'Posts Management' },
  '/admin/new-post': { minRole: 'editor' as UserRole, description: 'Create Post' },
  '/admin/edit-post': { minRole: 'editor' as UserRole, description: 'Edit Post' },
  '/admin/users': { minRole: 'admin' as UserRole, description: 'User Management' },
  '/admin/settings': { minRole: 'admin' as UserRole, description: 'Site Settings' },
  '/admin/api-settings': { minRole: 'admin' as UserRole, description: 'API Configuration' },
  '/admin/appearance': { minRole: 'admin' as UserRole, description: 'Appearance Settings' },
  '/admin/seo': { minRole: 'editor' as UserRole, description: 'SEO Settings' },
  '/admin/diagnostics': { minRole: 'reviewer' as UserRole, description: 'System Diagnostics' },
  '/admin/journalists': { minRole: 'editor' as UserRole, description: 'AI Journalists' },
  '/admin/rss': { minRole: 'editor' as UserRole, description: 'RSS Feeds' },
  '/admin/pages': { minRole: 'editor' as UserRole, description: 'Pages Management' },
  '/admin/categories': { minRole: 'editor' as UserRole, description: 'Categories' },
  '/admin/media': { minRole: 'editor' as UserRole, description: 'Media Library' },
  '/admin/comments': { minRole: 'editor' as UserRole, description: 'Comments' }
};

/**
 * Check if a role can access a specific endpoint
 */
export function canAccessEndpoint(role: UserRole, endpoint: string): boolean {
  const endpointConfig = ADMIN_ENDPOINTS[endpoint as keyof typeof ADMIN_ENDPOINTS];
  if (!endpointConfig) return true; // Public endpoint
  
  return hasRoleLevel(role, endpointConfig.minRole);
}
