import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { 
  CreateBroadcastRequest, 
  CreateBroadcastResponse,
  GetOrganizationalUnitsResponse,
  GetRolesResponse,
  SaveTemplateRequest,
  SaveTemplateResponse,
  GetTemplatesResponse
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

/**
 * Save a broadcast template
 * @param templateData - The template data to save
 * @returns Response with the saved template
 */
export async function saveTemplate(
  templateData: SaveTemplateRequest
): Promise<SaveTemplateResponse> {
  return await apiClient.post<SaveTemplateResponse>(
    API_CONFIG.endpoints.broadcast.templates,  // Use templates instead of saveTemplate
    templateData
  );
}

/**
 * Get broadcast templates
 * @returns Response with templates
 */
export async function getTemplates(): Promise<GetTemplatesResponse> {
  return await apiClient.get<GetTemplatesResponse>(
    API_CONFIG.endpoints.broadcast.templates  // Use templates instead of getTemplates
  );
}

/**
 * Delete a broadcast template
 * @param templateId - The ID of the template to delete
 * @returns Response confirming deletion
 */
export async function deleteTemplate(
  templateId: string
): Promise<{ ok: boolean; message: string }> {
  return await apiClient.delete<{ ok: boolean; message: string }>(
    `${API_CONFIG.endpoints.broadcast.templates}/${templateId}`
  );
}

export async function getBroadcasts(): Promise<GetBroadcastsResponse> {
  return await apiClient.get<GetBroadcastsResponse>(
    API_CONFIG.endpoints.broadcast.getBroadcasts
  );
}