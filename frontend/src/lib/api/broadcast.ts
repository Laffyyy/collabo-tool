import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { 
  CreateBroadcastRequest, 
  CreateBroadcastResponse,
  GetOrganizationalUnitsResponse,
  GetRolesResponse
} from './types';

/**
 * Create a new broadcast
 * @param broadcastData - The broadcast data to create
 * @returns Response with the created broadcast
 */
export async function createBroadcast(
  broadcastData: CreateBroadcastRequest
): Promise<CreateBroadcastResponse> {
  console.log('[Broadcast API] Creating broadcast:', broadcastData);
  return await apiClient.post<CreateBroadcastResponse>(
    API_CONFIG.endpoints.broadcast.create,
    broadcastData
  );
}

/**
 * Get all available organizational units for broadcast targeting
 * @returns Response with organizational units
 */
export async function getOrganizationalUnits(): Promise<GetOrganizationalUnitsResponse> {
  return await apiClient.get<GetOrganizationalUnitsResponse>(
    API_CONFIG.endpoints.broadcast.getOUs
  );
}

/**
 * Get all available roles for broadcast targeting
 * @returns Response with roles
 */
export async function getRoles(): Promise<GetRolesResponse> {
  return await apiClient.get<GetRolesResponse>(
    API_CONFIG.endpoints.broadcast.getRoles
  );
}