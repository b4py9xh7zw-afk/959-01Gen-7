import { request } from './api';
import type {
  User,
  Software,
  Seat,
  Application,
  ApplicationWithDetails,
  QueueResponse,
  QueueItem,
  License,
  StatisticsOverview,
  SoftwareUsageStats,
  DepartmentUsageStats,
  LoginRequest,
  LoginResponse,
} from '../../shared/types';

export const authApi = {
  login: (data: LoginRequest) => request<LoginResponse>('post', '/auth/login', data),
  logout: () => request<{ success: boolean }>('post', '/auth/logout'),
  getCurrentUser: () => request<User>('get', '/auth/me'),
};

export const softwareApi = {
  getAll: (params?: { category?: string; page?: number; pageSize?: number }) =>
    request<Software[]>('get', '/software', undefined, params),
  getById: (id: string) => request<Software>('get', `/software/${id}`),
  create: (data: Omit<Software, 'id' | 'usedSeats' | 'createdAt' | 'averageUsageHours'>) =>
    request<Software>('post', '/software', data),
  update: (id: string, data: Partial<Software>) =>
    request<Software>('put', `/software/${id}`, data),
  delete: (id: string) => request<{ success: boolean }>('delete', `/software/${id}`),
  getSeats: (softwareId: string) => request<Seat[]>('get', `/software/${softwareId}/seats`),
  addSeat: (softwareId: string) => request<Seat>('post', `/software/${softwareId}/seats`),
  updateSeatStatus: (softwareId: string, seatId: string, status: string) =>
    request<Seat>('put', `/software/${softwareId}/seats/${seatId}`, { status }),
};

export const applicationApi = {
  getAll: (params?: {
    status?: string;
    userId?: string;
    softwareId?: string;
    department?: string;
    page?: number;
    pageSize?: number;
  }) => request<Application[]>('get', '/applications', undefined, params),
  getById: (id: string) => request<ApplicationWithDetails>('get', `/applications/${id}`),
  create: (data: Omit<Application, 'id' | 'status' | 'createdAt'>) =>
    request<Application>('post', '/applications', data),
  approve: (id: string, approverId?: string) =>
    request<Application>('put', `/applications/${id}/approve`, { approverId }),
  reject: (id: string, rejectionReason: string, approverId?: string) =>
    request<Application>('put', `/applications/${id}/reject`, { approverId, rejectionReason }),
  getPendingCount: (department?: string) =>
    request<{ count: number }>('get', '/applications/pending/count', undefined, { department }),
};

export const queueApi = {
  getQueue: (softwareId: string) => request<QueueResponse>('get', `/queue/${softwareId}`),
  joinQueue: (softwareId: string, applicationId: string) =>
    request<QueueItem>('post', '/queue', { softwareId, applicationId }),
  leaveQueue: (id: string) => request<{ success: boolean }>('delete', `/queue/${id}`),
  updateEstimates: () => request<{ success: boolean }>('put', '/queue/update-estimates'),
};

export const licenseApi = {
  getAll: (params?: {
    userId?: string;
    softwareId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => request<License[]>('get', '/licenses', undefined, params),
  getById: (id: string) => request<License>('get', `/licenses/${id}`),
  create: (data: { userId: string; softwareId: string; applicationId: string; startDate: string; endDate: string }) =>
    request<License>('post', '/licenses', data),
  revoke: (id: string) => request<License>('put', `/licenses/${id}/revoke`),
  renew: (id: string, endDate: string) =>
    request<License>('put', `/licenses/${id}/renew`, { endDate }),
  returnLicense: (id: string) => request<License>('put', `/licenses/${id}/return`),
  checkout: (id: string) => request<License>('put', `/licenses/${id}/checkout`),
  checkin: (id: string) => request<License>('put', `/licenses/${id}/checkin`),
  revokeExpired: () => request<{ count: number }>('put', '/licenses/revoke-expired'),
};

export const statisticsApi = {
  getOverview: () => request<StatisticsOverview>('get', '/statistics/overview'),
  getSoftwareUsage: (params?: { startDate?: string; endDate?: string }) =>
    request<SoftwareUsageStats[]>('get', '/statistics/software-usage', undefined, params),
  getDepartmentUsage: () => request<DepartmentUsageStats[]>('get', '/statistics/department-usage'),
  getPopularSoftware: (limit?: number) =>
    request<any[]>('get', '/statistics/popular-software', undefined, { limit }),
  getRecentActivity: (limit?: number) =>
    request<any[]>('get', '/statistics/recent-activity', undefined, { limit }),
  getMonthlyUsage: () => request<any[]>('get', '/statistics/monthly-usage'),
};

export const userApi = {
  getAll: (params?: {
    page?: number;
    pageSize?: number;
    role?: string;
    status?: string;
    department?: string;
    search?: string;
  }) => request<User[]>('get', '/users', undefined, params),
  getDepartments: () => request<string[]>('get', '/users/departments'),
  getById: (id: string) => request<User>('get', `/users/${id}`),
  create: (data: Omit<User, 'id' | 'createdAt' | 'status'> & { password: string }) =>
    request<User>('post', '/users', data),
  update: (id: string, data: Partial<User>) => request<User>('put', `/users/${id}`, data),
  updateRole: (id: string, role: string) =>
    request<User>('put', `/users/${id}/role`, { role }),
  updateStatus: (id: string, status: string) =>
    request<User>('put', `/users/${id}/status`, { status }),
};
