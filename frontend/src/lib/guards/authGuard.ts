import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth.svelte';
import { get } from 'svelte/store';

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated(): boolean {
  const auth = get(authStore);
  return auth.isAuthenticated && !!auth.user;
}

/**
 * Check if user has a specific role
 * @param {string|string[]} roles - Required role(s)
 * @returns {boolean} True if user has required role
 */
export function hasRole(roles: string | string[]): boolean {
  const auth = get(authStore);
  if (!auth.isAuthenticated || !auth.user) return false;
  
  const userRole = auth.user.role.toLowerCase();
  
  // Admin has access to everything
  if (userRole === 'admin') return true;
  
  // Check against array of roles
  if (Array.isArray(roles)) {
    return roles.some(role => role.toLowerCase() === userRole);
  }
  
  // Check against single role
  return roles.toLowerCase() === userRole;
}

/**
 * Redirect to login if not authenticated
 */
export function requireAuth(): void {
  if (!isAuthenticated()) {
    goto('/login');
  }
}

/**
 * Redirect to login if not authenticated or doesn't have required role
 * @param {string|string[]} roles - Required role(s)
 */
export function requireRole(roles: string | string[]): void {
  if (!isAuthenticated()) {
    goto('/login');
    return;
  }
  
  if (!hasRole(roles)) {
    goto('/unauthorized');
  }
}