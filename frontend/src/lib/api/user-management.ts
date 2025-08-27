import { API_CONFIG } from './config';
import type { ApiUser, UsersResponse, Role, OrganizationalUnit } from './types';

/**
 * User Management API Service
 */

// Helper function for making authenticated requests
function makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'  // Include cookies for authentication
  });
}

export interface CreateUserRequest {
  employeeId: string;
  name: string;
  email: string;
  ou?: string;
  role: string;
  supervisorId?: string;
  managerId?: string;
  password?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  ou?: string;
  role?: string;
  supervisorId?: string;
  managerId?: string;
  status?: string;
}

export interface BulkUserRequest {
  users: CreateUserRequest[];
}

export interface BulkStatusRequest {
  userIds: string[];
  locked?: boolean;
  active?: boolean;
}

export interface PasswordChangeRequest {
  newPassword: string;
  requirePasswordChange?: boolean;
}

export interface HierarchyOptions {
  supervisors: ApiUser[];
  managers: ApiUser[];
}

export interface TeamMember extends ApiUser {
  // Additional team-specific properties can be added here
}

/**
 * Get all users with filtering and pagination
 */
export async function getUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  ou?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<UsersResponse> {
  const searchParams = new URLSearchParams();
  
  // If no pagination is specified, get all users
  if (!params.page && !params.limit) {
    params.limit = 1000; // Set a high limit to get all users
  }
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const url = `${API_CONFIG.baseUrl}/api/v1/users?${searchParams.toString()}`;
  
  const response = await makeAuthenticatedRequest(url, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<{ ok: boolean; data: { user: ApiUser } }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/${id}`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create new user
 */
export async function createUser(userData: CreateUserRequest): Promise<{ ok: boolean; message: string; data: { user: ApiUser } }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users`, {
    method: 'POST',
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create user');
  }

  return response.json();
}

/**
 * Update user
 */
export async function updateUser(id: string, userData: UpdateUserRequest): Promise<{ ok: boolean; message: string; data: { user: ApiUser } }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update user');
  }

  return response.json();
}

/**
 * Change user password
 */
export async function changeUserPassword(id: string, passwordData: PasswordChangeRequest): Promise<{ ok: boolean; message: string }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify(passwordData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to change password');
  }

  return response.json();
}

/**
 * Lock/unlock user
 */
export async function toggleUserLock(id: string, locked: boolean): Promise<{ ok: boolean; message: string }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/${id}/lock`, {
    method: 'PUT',
    body: JSON.stringify({ locked })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update user lock status');
  }

  return response.json();
}

/**
 * Activate/deactivate user
 */
export async function toggleUserActivation(id: string, active: boolean): Promise<{ ok: boolean; message: string }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/${id}/activate`, {
    method: 'PUT',
    body: JSON.stringify({ active })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update user activation status');
  }

  return response.json();
}

/**
 * Bulk lock/unlock users
 */
export async function bulkLockUsers(userIds: string[], locked: boolean): Promise<{ ok: boolean; message: string; data: { affectedUsers: number } }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/bulk/lock`, {
    method: 'POST',
    body: JSON.stringify({ userIds, locked })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to bulk update user lock status');
  }

  return response.json();
}

/**
 * Bulk activate/deactivate users
 */
export async function bulkActivateUsers(userIds: string[], active: boolean): Promise<{ ok: boolean; message: string; data: { affectedUsers: number } }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/bulk/activate`, {
    method: 'POST',
    body: JSON.stringify({ userIds, active })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to bulk update user activation status');
  }

  return response.json();
}

/**
 * Bulk create users
 */
export async function bulkCreateUsers(users: CreateUserRequest[]): Promise<{ ok: boolean; message: string; data: { successful: ApiUser[]; failed: any[] } }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/bulk/upload`, {
    method: 'POST',
    body: JSON.stringify({ users })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to bulk create users');
  }

  return response.json();
}

/**
 * Get organizational units
 */
export async function getOrganizationalUnits(): Promise<{ ok: boolean; data: { ous: OrganizationalUnit[] } }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/reference/ous`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch organizational units: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get hierarchy options (supervisors and managers)
 */
export async function getHierarchyOptions(filters: { ou?: string; role?: string } = {}): Promise<{ ok: boolean; data: HierarchyOptions }> {
  const searchParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });

  const url = `${API_CONFIG.baseUrl}/api/v1/users/reference/hierarchy?${searchParams.toString()}`;
  
  const response = await makeAuthenticatedRequest(url, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch hierarchy options: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user's team
 */
export async function getUserTeam(id: string): Promise<{ ok: boolean; data: { user: ApiUser; teamMembers: TeamMember[] } }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/${id}/team`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user team: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(id: string): Promise<{ ok: boolean; message: string }> {
  const response = await makeAuthenticatedRequest(`${API_CONFIG.baseUrl}/api/v1/users/${id}/send-reset`, {
    method: 'POST'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send password reset');
  }

  return response.json();
}
