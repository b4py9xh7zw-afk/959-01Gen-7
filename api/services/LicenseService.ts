import { db } from '../database';
import { SoftwareService } from './SoftwareService';
import { QueueService } from './QueueService';
import type { License, LicenseStatus } from '../../shared/types';

export class LicenseService {
  static getAll(
    page: number = 1,
    pageSize: number = 20,
    userId?: string,
    softwareId?: string,
    status?: string
  ): { data: License[]; total: number } {
    let filtered = [...db.licenses];

    if (userId) {
      filtered = filtered.filter((l) => l.userId === userId);
    }

    if (softwareId) {
      filtered = filtered.filter((l) => l.softwareId === softwareId);
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((l) => l.status === status);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return { data, total };
  }

  static getById(id: string): License | null {
    return db.licenses.find((l) => l.id === id) || null;
  }

  static create(
    userId: string,
    softwareId: string,
    applicationId: string,
    startDate: string,
    endDate: string
  ): License | null {
    const seat = SoftwareService.getAvailableSeat(softwareId);
    if (!seat) {
      return null;
    }

    const license: License = {
      id: db.generateId('lic'),
      userId,
      softwareId,
      seatId: seat.id,
      applicationId,
      startDate,
      endDate,
      status: 'active',
      activatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    db.licenses.push(license);

    seat.status = 'occupied';
    seat.currentUserId = userId;
    seat.assignedAt = new Date().toISOString();
    seat.expiresAt = endDate;

    SoftwareService.updateUsedSeats(softwareId);

    this.addUsageLog(userId, softwareId, license.id, 'activate');

    return license;
  }

  static revoke(id: string): License | null {
    const index = db.licenses.findIndex((l) => l.id === id);
    if (index === -1) return null;

    const license = db.licenses[index];
    license.status = 'revoked';

    const seat = db.seats.find((s) => s.id === license.seatId);
    if (seat) {
      seat.status = 'available';
      seat.currentUserId = undefined;
      seat.assignedAt = undefined;
      seat.expiresAt = undefined;
    }

    SoftwareService.updateUsedSeats(license.softwareId);
    this.addUsageLog(license.userId, license.softwareId, license.id, 'deactivate');

    this.processQueueForSeat(license.softwareId);

    return license;
  }

  static renew(id: string, endDate: string): License | null {
    const index = db.licenses.findIndex((l) => l.id === id);
    if (index === -1) return null;

    const license = db.licenses[index];
    license.endDate = endDate;
    license.status = 'active';

    const seat = db.seats.find((s) => s.id === license.seatId);
    if (seat) {
      seat.expiresAt = endDate;
    }

    return license;
  }

  static returnLicense(id: string): License | null {
    const license = db.licenses.find((l) => l.id === id);
    if (!license) return null;

    license.status = 'expired';
    license.lastUsedAt = new Date().toISOString();

    const seat = db.seats.find((s) => s.id === license.seatId);
    if (seat) {
      seat.status = 'available';
      seat.currentUserId = undefined;
      seat.assignedAt = undefined;
      seat.expiresAt = undefined;
    }

    SoftwareService.updateUsedSeats(license.softwareId);
    this.addUsageLog(license.userId, license.softwareId, license.id, 'checkin');

    this.processQueueForSeat(license.softwareId);

    return license;
  }

  private static processQueueForSeat(softwareId: string): void {
    const nextInQueue = QueueService.getNextInQueue(softwareId);
    if (nextInQueue) {
      QueueService.leaveQueue(nextInQueue.id);
    }
  }

  private static addUsageLog(
    userId: string,
    softwareId: string,
    licenseId: string,
    action: 'activate' | 'deactivate' | 'checkout' | 'checkin'
  ): void {
    db.usageLogs.push({
      id: db.generateId('log'),
      userId,
      softwareId,
      licenseId,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  static checkoutLicense(id: string): License | null {
    const license = db.licenses.find((l) => l.id === id);
    if (!license || license.status !== 'active') return null;

    license.lastUsedAt = new Date().toISOString();
    this.addUsageLog(license.userId, license.softwareId, license.id, 'checkout');

    return license;
  }

  static checkinLicense(id: string): License | null {
    const license = db.licenses.find((l) => l.id === id);
    if (!license) return null;

    license.lastUsedAt = new Date().toISOString();
    this.addUsageLog(license.userId, license.softwareId, license.id, 'checkin');

    return license;
  }

  static revokeExpiredLicenses(): number {
    const now = new Date();
    let revokedCount = 0;

    db.licenses.forEach((license) => {
      if (license.status === 'active' && new Date(license.endDate) < now) {
        license.status = 'expired';

        const seat = db.seats.find((s) => s.id === license.seatId);
        if (seat) {
          seat.status = 'available';
          seat.currentUserId = undefined;
          seat.assignedAt = undefined;
          seat.expiresAt = undefined;
        }

        SoftwareService.updateUsedSeats(license.softwareId);
        revokedCount++;

        this.processQueueForSeat(license.softwareId);
      }
    });

    return revokedCount;
  }

  static getActiveCount(softwareId?: string): number {
    let licenses = db.licenses.filter((l) => l.status === 'active');
    if (softwareId) {
      licenses = licenses.filter((l) => l.softwareId === softwareId);
    }
    return licenses.length;
  }
}
