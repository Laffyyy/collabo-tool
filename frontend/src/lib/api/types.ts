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

// Add other response types as needed