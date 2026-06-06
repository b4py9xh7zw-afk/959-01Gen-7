import { db } from '../database';
import type { Application, ApplicationStatus, ApplicationWithDetails } from '../../shared/types';

export class ApplicationService {
  static getAll(
    page: number = 1,
    pageSize: number = 20,
    status?: string,
    userId?: string,
    softwareId?: string,
    department?: string
  ): { data: Application[]; total: number } {
    let filtered = [...db.applications];

    if (status && status !== 'all') {
      filtered = filtered.filter((a) => a.status === status);
    }

    if (userId) {
      filtered = filtered.filter((a) => a.userId === userId);
    }

    if (softwareId) {
      filtered = filtered.filter((a) => a.softwareId === softwareId);
    }

    if (department && department !== 'all') {
      filtered = filtered.filter((a) => a.department === department);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return { data, total };
  }

  static getById(id: string): ApplicationWithDetails | null {
    const application = db.applications.find((a) => a.id === id);
    if (!application) return null;

    const user = db.users.find((u) => u.id === application.userId);
    const software = db.softwareList.find((s) => s.id === application.softwareId);

    if (!user || !software) return null;

    const { password, ...userWithoutPassword } = user;

    return {
      ...application,
      user: userWithoutPassword,
      software,
    };
  }

  static create(application: Omit<Application, 'id' | 'status' | 'createdAt'>): Application {
    const newApplication: Application = {
      ...application,
      id: db.generateId('app'),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.applications.push(newApplication);
    return newApplication;
  }

  static approve(id: string, approverId: string): Application | null {
    const index = db.applications.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const application = db.applications[index];
    application.status = 'approved';
    application.approverId = approverId;
    application.approvedAt = new Date().toISOString();

    db.queueItems = db.queueItems.filter((q) => q.applicationId !== id);

    return application;
  }

  static reject(id: string, approverId: string, rejectionReason: string): Application | null {
    const index = db.applications.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const application = db.applications[index];
    application.status = 'rejected';
    application.approverId = approverId;
    application.rejectionReason = rejectionReason;

    db.queueItems = db.queueItems.filter((q) => q.applicationId !== id);

    return application;
  }

  static getPendingCount(department?: string): number {
    let apps = db.applications.filter((a) => a.status === 'pending');
    if (department && department !== 'all') {
      apps = apps.filter((a) => a.department === department);
    }
    return apps.length;
  }
}
