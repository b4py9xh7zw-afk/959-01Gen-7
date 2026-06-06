export type UserRole = 'student' | 'teacher' | 'admin';
export type UserStatus = 'active' | 'graduated' | 'resigned';
export type SoftwareCategory = 'statistics' | 'simulation' | 'graphics' | 'other';
export type SeatStatus = 'available' | 'occupied' | 'maintenance';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type ApplicationType = 'course' | 'research' | 'personal';
export type LicenseStatus = 'active' | 'expired' | 'revoked';
export type UsageLogAction = 'activate' | 'deactivate' | 'checkout' | 'checkin';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  department: string;
  studentId?: string;
  employeeId?: string;
  status: UserStatus;
  enrollmentDate?: string;
  graduationDate?: string;
  createdAt: string;
}

export interface Software {
  id: string;
  name: string;
  category: SoftwareCategory;
  version: string;
  vendor: string;
  description: string;
  totalSeats: number;
  usedSeats: number;
  price: number;
  purchaseDate: string;
  expirationDate: string;
  icon: string;
  averageUsageHours: number;
  createdAt: string;
}

export interface Seat {
  id: string;
  softwareId: string;
  licenseKey: string;
  status: SeatStatus;
  currentUserId?: string;
  assignedAt?: string;
  expiresAt?: string;
}

export interface Application {
  id: string;
  userId: string;
  softwareId: string;
  purpose: string;
  type: ApplicationType;
  courseName?: string;
  projectName?: string;
  department: string;
  startDate: string;
  endDate: string;
  status: ApplicationStatus;
  approverId?: string;
  rejectionReason?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface QueueItem {
  id: string;
  userId: string;
  softwareId: string;
  position: number;
  estimatedWaitTime: number;
  joinedAt: string;
  applicationId: string;
}

export interface License {
  id: string;
  userId: string;
  softwareId: string;
  seatId: string;
  applicationId: string;
  startDate: string;
  endDate: string;
  status: LicenseStatus;
  activatedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface UsageLog {
  id: string;
  userId: string;
  softwareId: string;
  licenseId: string;
  action: UsageLogAction;
  timestamp: string;
  ipAddress?: string;
}

export interface ApplicationWithDetails extends Application {
  user: User;
  software: Software;
}

export interface QueueResponse {
  items: QueueItem[];
  currentUserPosition?: QueueItem;
}

export interface StatisticsOverview {
  totalSoftware: number;
  totalSeats: number;
  usedSeats: number;
  activeUsers: number;
  pendingApplications: number;
  queueLength: number;
}

export interface SoftwareUsageStats {
  softwareId: string;
  softwareName: string;
  usageHours: number;
  usageRate: number;
}

export interface DepartmentUsageStats {
  department: string;
  userCount: number;
  licenseCount: number;
}

export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  message?: string;
  total?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
