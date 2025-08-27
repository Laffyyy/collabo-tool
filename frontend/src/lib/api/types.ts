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

// Add other response types as needed