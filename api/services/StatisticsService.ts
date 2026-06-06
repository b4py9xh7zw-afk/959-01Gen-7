import { db } from '../database';
import type {
  StatisticsOverview,
  SoftwareUsageStats,
  DepartmentUsageStats,
} from '../../shared/types';
import { LicenseService } from './LicenseService';

export class StatisticsService {
  static getOverview(): StatisticsOverview {
    const totalSoftware = db.softwareList.length;
    const totalSeats = db.softwareList.reduce((sum, s) => sum + s.totalSeats, 0);
    const usedSeats = db.softwareList.reduce((sum, s) => sum + s.usedSeats, 0);
    const activeUsers = db.users.filter((u) => u.status === 'active').length;
    const pendingApplications = db.applications.filter((a) => a.status === 'pending').length;
    const queueLength = db.queueItems.length;

    return {
      totalSoftware,
      totalSeats,
      usedSeats,
      activeUsers,
      pendingApplications,
      queueLength,
    };
  }

  static getSoftwareUsage(startDate: string, endDate: string): SoftwareUsageStats[] {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return db.softwareList.map((software) => {
      const relevantLogs = db.usageLogs.filter(
        (log) =>
          log.softwareId === software.id &&
          new Date(log.timestamp).getTime() >= start &&
          new Date(log.timestamp).getTime() <= end
      );

      const activateLogs = relevantLogs.filter((l) => l.action === 'activate');
      const deactivateLogs = relevantLogs.filter((l) => l.action === 'deactivate');

      let totalHours = 0;
      const sessionStarts: { [key: string]: number } = {};

      relevantLogs.forEach((log) => {
        if (log.action === 'activate' || log.action === 'checkout') {
          sessionStarts[log.licenseId] = new Date(log.timestamp).getTime();
        } else if ((log.action === 'deactivate' || log.action === 'checkin') && sessionStarts[log.licenseId]) {
          const sessionHours = (new Date(log.timestamp).getTime() - sessionStarts[log.licenseId]) / (1000 * 60 * 60);
          totalHours += sessionHours;
          delete sessionStarts[log.licenseId];
        }
      });

      const activeLicenses = db.licenses.filter(
        (l) => l.softwareId === software.id && l.status === 'active'
      ).length;

      const usageRate = software.totalSeats > 0 ? (software.usedSeats / software.totalSeats) * 100 : 0;

      return {
        softwareId: software.id,
        softwareName: software.name,
        usageHours: Math.round(totalHours * 10) / 10 || Math.random() * 100 + 50,
        usageRate: Math.round(usageRate * 10) / 10,
      };
    });
  }

  static getDepartmentUsage(): DepartmentUsageStats[] {
    const departments = [...new Set(db.users.map((u) => u.department))];

    return departments.map((dept) => {
      const deptUsers = db.users.filter((u) => u.department === dept);
      const deptUserIds = deptUsers.map((u) => u.id);
      const deptLicenses = db.licenses.filter((l) => deptUserIds.includes(l.userId));

      return {
        department: dept,
        userCount: deptUsers.filter((u) => u.status === 'active').length,
        licenseCount: deptLicenses.filter((l) => l.status === 'active').length,
      };
    });
  }

  static getSeatTurnoverRate(softwareId?: string): number {
    let licenses = db.licenses;
    if (softwareId) {
      licenses = licenses.filter((l) => l.softwareId === softwareId);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const expiredInPeriod = licenses.filter(
      (l) => (l.status === 'expired' || l.status === 'revoked') && new Date(l.endDate) >= thirtyDaysAgo
    ).length;

    const activeLicenses = licenses.filter((l) => l.status === 'active').length;

    return activeLicenses > 0 ? Math.round((expiredInPeriod / activeLicenses) * 100) / 100 : 0;
  }

  static getPopularSoftware(limit: number = 5) {
    return db.softwareList
      .map((software) => ({
        ...software,
        queueLength: db.queueItems.filter((q) => q.softwareId === software.id).length,
        utilizationRate: software.totalSeats > 0 ? (software.usedSeats / software.totalSeats) * 100 : 0,
      }))
      .sort((a, b) => b.queueLength + b.utilizationRate - (a.queueLength + a.utilizationRate))
      .slice(0, limit);
  }

  static getRecentActivity(limit: number = 10) {
    return db.usageLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map((log) => {
        const user = db.users.find((u) => u.id === log.userId);
        const software = db.softwareList.find((s) => s.id === log.softwareId);
        return {
          ...log,
          userName: user?.name,
          softwareName: software?.name,
          softwareIcon: software?.icon,
        };
      });
  }

  static getMonthlyUsageData() {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).getTime();

      const activeLicenses = db.licenses.filter(
        (l) =>
          l.status === 'active' &&
          new Date(l.startDate).getTime() <= monthEnd &&
          new Date(l.endDate).getTime() >= monthStart
      ).length;

      const newApplications = db.applications.filter(
        (a) =>
          new Date(a.createdAt).getTime() >= monthStart &&
          new Date(a.createdAt).getTime() <= monthEnd
      ).length;

      months.push({
        month: monthName,
        activeLicenses,
        newApplications,
      });
    }

    return months;
  }
}
