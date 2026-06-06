import { db } from '../database';
import type { Software, SoftwareCategory } from '../../shared/types';

export class SoftwareService {
  static getAll(category?: string, page: number = 1, pageSize: number = 20): { data: Software[]; total: number } {
    let filtered = [...db.softwareList];

    if (category && category !== 'all') {
      filtered = filtered.filter((s) => s.category === category);
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return { data, total };
  }

  static getById(id: string): Software | null {
    return db.softwareList.find((s) => s.id === id) || null;
  }

  static create(software: Omit<Software, 'id' | 'usedSeats' | 'createdAt' | 'averageUsageHours'>): Software {
    const newSoftware: Software = {
      ...software,
      id: db.generateId('sw'),
      usedSeats: 0,
      averageUsageHours: 8,
      createdAt: new Date().toISOString(),
    };

    db.softwareList.push(newSoftware);

    for (let i = 0; i < software.totalSeats; i++) {
      db.seats.push({
        id: db.generateId('seat'),
        softwareId: newSoftware.id,
        licenseKey: `${software.name.toUpperCase().replace(/\s/g, '')}-${String(i + 1).padStart(4, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'available',
      });
    }

    return newSoftware;
  }

  static update(id: string, updates: Partial<Software>): Software | null {
    const index = db.softwareList.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const oldSoftware = db.softwareList[index];
    const newSoftware = { ...oldSoftware, ...updates };

    if (updates.totalSeats && updates.totalSeats > oldSoftware.totalSeats) {
      const diff = updates.totalSeats - oldSoftware.totalSeats;
      for (let i = 0; i < diff; i++) {
        db.seats.push({
          id: db.generateId('seat'),
          softwareId: id,
          licenseKey: `${oldSoftware.name.toUpperCase().replace(/\s/g, '')}-${String(oldSoftware.totalSeats + i + 1).padStart(4, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          status: 'available',
        });
      }
    }

    db.softwareList[index] = newSoftware;
    return newSoftware;
  }

  static delete(id: string): { success: boolean } {
    const index = db.softwareList.findIndex((s) => s.id === id);
    if (index === -1) return { success: false };

    db.softwareList.splice(index, 1);
    db.seats = db.seats.filter((s) => s.softwareId !== id);
    db.queueItems = db.queueItems.filter((q) => q.softwareId !== id);

    return { success: true };
  }

  static updateUsedSeats(softwareId: string): void {
    const software = db.softwareList.find((s) => s.id === softwareId);
    if (!software) return;

    const usedCount = db.seats.filter((s) => s.softwareId === softwareId && s.status === 'occupied').length;
    software.usedSeats = usedCount;
  }

  static getAvailableSeat(softwareId: string) {
    return db.seats.find((s) => s.softwareId === softwareId && s.status === 'available');
  }
}
