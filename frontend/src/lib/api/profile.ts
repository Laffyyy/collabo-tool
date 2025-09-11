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
    const response = await makeAuthenticatedRequest(this.baseUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async updateUserProfile(updateData: Partial<{
    firstName: string;
    lastName: string;
    onlineStatus: 'online' | 'away' | 'idle' | 'offline';
    profilePhoto: string;
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