import { API_CONFIG } from './config';

export interface UserProfile {
  id: string;
  employeeId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationUnit?: string;
  supervisor?: string;
  manager?: string;
  joinDate: Date;
  lastLogin?: Date;
  profilePhoto?: string;
  coverPhoto?: string;  // Add this line
  onlineStatus: 'online' | 'away' | 'idle' | 'offline';
  accountStatus: string;
}

export interface TeamStructure {
  type: 'manager' | 'supervisor' | 'team_member';
  supervisors?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  teamMembers?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  manager?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  supervisor?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  onlineStatus?: 'online' | 'away' | 'idle' | 'offline';
  profilePhoto?: string;
  coverPhoto?: string;  // Add this field
}

function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('authToken');
  
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

class ProfileAPI {
  private baseUrl = `${API_CONFIG.baseUrl}/api/v1/profile`;

  async getUserProfile(): Promise<{ ok: boolean; data: { profile: UserProfile } }> {
    console.log('[ProfileAPI] Making request to:', this.baseUrl);
    const response = await makeAuthenticatedRequest(this.baseUrl);
    console.log('[ProfileAPI] Response status:', response.status);
    
    if (!response.ok) {
      console.error('[ProfileAPI] Request failed with status:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ProfileAPI] Response data:', data);
    console.log('[ProfileAPI] Profile photo in response:', data.data?.profile?.profilePhoto);
    
    return data;
  }

  async updateUserProfile(updateData: Partial<{
    firstName: string;
    lastName: string;
    onlineStatus: 'online' | 'away' | 'idle' | 'offline';
    profilePhoto: string;
    coverPhoto: string;  // Add this line
  }>): Promise<{ ok: boolean; data: { profile: UserProfile }; message: string }> {
    const response = await makeAuthenticatedRequest(this.baseUrl, {
        method: 'PUT',
        body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async getUserTeamStructure(): Promise<{ ok: boolean; data: { teamStructure: TeamStructure } }> {
    const response = await makeAuthenticatedRequest(`${this.baseUrl}/team`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }
}

export const profileAPI = new ProfileAPI();