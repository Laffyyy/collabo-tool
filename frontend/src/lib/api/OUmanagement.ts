import axios, { AxiosError } from 'axios';

// Base URL for the API - adjust according to your backend configuration
const API_BASE_URL = 'http://localhost:5000/api/OUmanager/';

// TypeScript interfaces
interface OUSettings {
  Chat?: {
    General?: {
      FileSharing?: boolean;
      Emoji?: boolean;
      Retention?: number;
    };
    Frontline?: {
      Init1v1?: boolean;
      CreateGroup?: boolean;
      JoinGroupChats?: boolean;
      ShareFiles?: boolean;
      ForwardMessage?: boolean;
    };
    support?: {
      Init1v1?: boolean;
      CreateGroup?: boolean;
      JoinGroupChats?: boolean;
      ShareFiles?: boolean;
      ForwardMessage?: boolean;
    };
    supervisor?: {
      CreateGroup?: boolean;
      ShareFiles?: boolean;
      ForwardMessage?: boolean;
    };
  };
  broadcast?: {
    General?: {
      ApprovalforBroadcast?: boolean;
      ScheduleBroadcast?: boolean;
      PriorityBroadcast?: boolean;
      Retention?: number;
    };
    Frontline?: {
      CreateBroadcasts?: boolean;
      ReplyToBroadcasts?: boolean;
    };
    support?: {
      CreateBroadcasts?: boolean;
      ReplyToBroadcasts?: boolean;
    };
    supervisor?: {
      CreateBroadcasts?: boolean;
    };
  };
}

interface CreateOURequest {
  OrgName: string;
  Description: string;
  Location: string;
  Settings: OUSettings;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

interface OUQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
}

interface UpdateOURequest {
  id: string;
  name: string;
  description: string;
  parentouid?: string;
  OUSettings: any[];
}

// Frontend OU interface (matching the Svelte component)
interface FrontendOU {
  name: string;
  description: string;
  location: string;
  rules: {
    chat: {
      frontlineCanInitiate1v1: boolean;
      frontlineCanCreateGroups: boolean;
      frontlineCanJoinGroups: boolean;
      frontlineCanShareFiles: boolean;
      frontlineCanForwardMessages: boolean;
      supportCanInitiate1v1: boolean;
      supportCanCreateGroups: boolean;
      supportCanJoinGroups: boolean;
      supportCanShareFiles: boolean;
      supportCanForwardMessages: boolean;
      supervisorCanCreateGroups: boolean;
      supervisorCanShareFiles: boolean;
      supervisorCanForwardMessages: boolean;
      allowFileSharing: boolean;
      allowEmojis: boolean;
      messageRetentionDays: number;
    };
    broadcast: {
      frontlineCanCreateBroadcast: boolean;
      frontlineCanReplyToBroadcast: boolean;
      supportCanCreateBroadcast: boolean;
      supportCanReplyToBroadcast: boolean;
      supervisorCanCreateBroadcast: boolean;
      requireApprovalForBroadcast: boolean;
      allowScheduledBroadcasts: boolean;
      allowPriorityBroadcasts: boolean;
      broadcastRetentionDays: number;
    };
  };
}

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add request interceptor for authentication if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Create a new Organization Unit
 * @param ouData - Organization Unit data
 * @returns API response
 */
export const createOU = async (ouData: CreateOURequest): Promise<APIResponse> => {
  try {
    const response = await apiClient.post('/create', ouData);
    return {
      success: true,
      data: response.data,
      message: 'Organization Unit created successfully'
    };
  } catch (error) {
    console.error('Error creating OU:', error);
    const axiosError = error as AxiosError;
    return {
      success: false,
      error: (axiosError.response?.data as any)?.message || axiosError.message || 'Failed to create Organization Unit',
      details: axiosError.response?.data
    };
  }
};

/**
 * Get active Organization Units
 * @param params - Query parameters
 * @returns API response
 */
export const getActiveOUs = async (params: OUQueryParams = {}): Promise<APIResponse> => {
  try {
    const response = await apiClient.get('/active', { params });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching active OUs:', error);
    const axiosError = error as AxiosError;
    return {
      success: false,
      error: (axiosError.response?.data as any)?.message || axiosError.message || 'Failed to fetch Organization Units'
    };
  }
};

/**
 * Get inactive Organization Units
 * @param params - Query parameters
 * @returns API response
 */
export const getInactiveOUs = async (params: OUQueryParams = {}): Promise<APIResponse> => {
  try {
    const response = await apiClient.get('/deactive', { params });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching inactive OUs:', error);
    const axiosError = error as AxiosError;
    return {
      success: false,
      error: (axiosError.response?.data as any)?.message || axiosError.message || 'Failed to fetch inactive Organization Units'
    };
  }
};

/**
 * Deactivate an Organization Unit
 * @param id - OU ID to deactivate
 * @returns API response
 */
export const deactivateOU = async (id: string): Promise<APIResponse> => {
  try {
    const response = await apiClient.post('/deactive', { id });
    return {
      success: true,
      data: response.data,
      message: 'Organization Unit deactivated successfully'
    };
  } catch (error) {
    console.error('Error deactivating OU:', error);
    const axiosError = error as AxiosError;
    return {
      success: false,
      error: (axiosError.response?.data as any)?.message || axiosError.message || 'Failed to deactivate Organization Unit'
    };
  }
};

/**
 * Update an Organization Unit
 * @param updateData - Update data
 * @returns API response
 */
export const updateOU = async (updateData: UpdateOURequest): Promise<APIResponse> => {
  try {
    const response = await apiClient.post('/update', updateData);
    return {
      success: true,
      data: response.data,
      message: 'Organization Unit updated successfully'
    };
  } catch (error) {
    console.error('Error updating OU:', error);
    const axiosError = error as AxiosError;
    return {
      success: false,
      error: (axiosError.response?.data as any)?.message || axiosError.message || 'Failed to update Organization Unit'
    };
  }
};

/**
 * Transform frontend OU data to backend API format
 * @param frontendOU - Frontend OU object
 * @returns Backend API formatted object
 */
export const transformOUDataForAPI = (frontendOU: FrontendOU): CreateOURequest => {
  return {
    OrgName: frontendOU.name,
    Description: frontendOU.description,
    Location: frontendOU.location,
    Settings: {
      Chat: {
        General: {
          FileSharing: frontendOU.rules.chat.allowFileSharing,
          Emoji: frontendOU.rules.chat.allowEmojis,
          Retention: frontendOU.rules.chat.messageRetentionDays
        },
        Frontline: {
          Init1v1: frontendOU.rules.chat.frontlineCanInitiate1v1,
          CreateGroup: frontendOU.rules.chat.frontlineCanCreateGroups,
          JoinGroupChats: frontendOU.rules.chat.frontlineCanJoinGroups,
          ShareFiles: frontendOU.rules.chat.frontlineCanShareFiles,
          ForwardMessage: frontendOU.rules.chat.frontlineCanForwardMessages
        },
        support: {
          Init1v1: frontendOU.rules.chat.supportCanInitiate1v1,
          CreateGroup: frontendOU.rules.chat.supportCanCreateGroups,
          JoinGroupChats: frontendOU.rules.chat.supportCanJoinGroups,
          ShareFiles: frontendOU.rules.chat.supportCanShareFiles,
          ForwardMessage: frontendOU.rules.chat.supportCanForwardMessages
        },
        supervisor: {
          CreateGroup: frontendOU.rules.chat.supervisorCanCreateGroups,
          ShareFiles: frontendOU.rules.chat.supervisorCanShareFiles,
          ForwardMessage: frontendOU.rules.chat.supervisorCanForwardMessages
        }
      },
      broadcast: {
        General: {
          ApprovalforBroadcast: frontendOU.rules.broadcast.requireApprovalForBroadcast,
          ScheduleBroadcast: frontendOU.rules.broadcast.allowScheduledBroadcasts,
          PriorityBroadcast: frontendOU.rules.broadcast.allowPriorityBroadcasts,
          Retention: frontendOU.rules.broadcast.broadcastRetentionDays
        },
        Frontline: {
          CreateBroadcasts: frontendOU.rules.broadcast.frontlineCanCreateBroadcast,
          ReplyToBroadcasts: frontendOU.rules.broadcast.frontlineCanReplyToBroadcast
        },
        support: {
          CreateBroadcasts: frontendOU.rules.broadcast.supportCanCreateBroadcast,
          ReplyToBroadcasts: frontendOU.rules.broadcast.supportCanReplyToBroadcast
        },
        supervisor: {
          CreateBroadcasts: frontendOU.rules.broadcast.supervisorCanCreateBroadcast
        }
      }
    }
  };
};

export default {
  createOU,
  getActiveOUs,
  getInactiveOUs,
  deactivateOU,
  updateOU,
  transformOUDataForAPI
};