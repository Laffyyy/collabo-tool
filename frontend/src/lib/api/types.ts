/**
 * API response types for authentication endpoints
 */

export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  profilePhotoUrl?: string;
  accountStatus: string;
  mustChangePassword: boolean;
}

export interface ApiUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  ou: string;
  role: string;
  status: string;
  type: string;
  supervisorId: string | null;
  managerId: string | null;
  mustChangePassword: boolean;
  presenceStatus: string;
  lastLogin: string | null;
  lastSeen: string | null;
  joinDate: string;
  createdAt: string;
  updatedAt: string;
  supervisorName: string | null;
  managerName: string | null;
}

export interface ApiResponse {
  ok: boolean;
  message: string;
}

export interface LoginResponse extends ApiResponse {
  userId: string;
  username: string;
  email: string;
  step?: string;
  exists?: boolean;
  isLocked?: boolean;
  attemptsRemaining?: number;
  otpExpiresAt?: string;
}

export interface OtpVerificationResponse extends ApiResponse {
  user?: User;
  token?: string;
}

export interface UsersResponse extends ApiResponse {
  data: {
    users: ApiUser[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalUsers: number;
      itemsPerPage: number;
    };
  };
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface OrganizationalUnit {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface UsersResponse extends ApiResponse {
  data: {
    users: ApiUser[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalUsers: number;
      itemsPerPage: number;
    };
  };
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface OrganizationalUnit {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface OrganizationalUnit {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface BroadcastTarget {
  id: string;
  broadcastId: string;
  targetType: 'role' | 'ou' | 'user';
  targetId: string;
  targetName: string;
}

export interface Broadcast {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
  eventDate?: string;
  endDate?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'archived' | 'deleted';
  requiresAcknowledgment: boolean;
  responseType: 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox';
  choices?: string[];
  targets?: BroadcastTarget[];
}

export interface CreateBroadcastRequest {
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  targetRoles: string[];
  targetOUs: string[];
  responseType?: 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox';
  requiresAcknowledgment?: boolean;
  scheduledFor?: string | null;
  endDate?: string | null;
  choices?: string[] | null; // Add this property
}

export interface CreateBroadcastResponse {
  ok: boolean;
  message: string;
  broadcast: Broadcast;
}

export interface GetOrganizationalUnitsResponse {
  ok: boolean;
  organizationalUnits: OrganizationalUnit[];
}

export interface GetRolesResponse {
  ok: boolean;
  roles: Role[];
}

export interface BroadcastTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  targetRoles: string[];
  targetOUs: string[];
  acknowledgmentType: 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox';
  choices?: string[];
  createdBy: string;
  createdAt: Date;
}

export interface SaveTemplateRequest {
  name: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  acknowledgmentType?: 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox';
  choices?: string[] | null;
  targetOUs?: string[]; // Add these fields
  targetRoles?: string[];
}

export interface SaveTemplateResponse {
  ok: boolean;
  message: string;
  template: BroadcastTemplate;
}

export interface GetTemplatesResponse {
  ok: boolean;
  templates: BroadcastTemplate[];
}