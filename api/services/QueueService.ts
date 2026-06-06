import { db } from '../database';
import type { QueueItem, QueueResponse } from '../../shared/types';

export class QueueService {
  static getQueue(softwareId: string, currentUserId?: string): QueueResponse {
    let items = db.queueItems
      .filter((q) => q.softwareId === softwareId)
      .sort((a, b) => a.position - b.position);

    items = items.map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    db.queueItems = db.queueItems.map((item) => {
      if (item.softwareId === softwareId) {
        const newPosition = items.findIndex((i) => i.id === item.id) + 1;
        return { ...item, position: newPosition };
      }
      return item;
    });

    const currentUserPosition = currentUserId
      ? items.find((q) => q.userId === currentUserId)
      : undefined;

    this.updateEstimatedWaitTimes(softwareId);

    return {
      items,
      currentUserPosition,
    };
  }

  static joinQueue(softwareId: string, userId: string, applicationId: string): QueueItem | null {
    const existing = db.queueItems.find((q) => q.softwareId === softwareId && q.userId === userId);
    if (existing) return existing;

    const currentLength = db.queueItems.filter((q) => q.softwareId === softwareId).length;
    const software = db.softwareList.find((s) => s.id === softwareId);

    const newItem: QueueItem = {
      id: db.generateId('queue'),
      userId,
      softwareId,
      position: currentLength + 1,
      estimatedWaitTime: (currentLength + 1) * (software?.averageUsageHours || 12),
      joinedAt: new Date().toISOString(),
      applicationId,
    };

    db.queueItems.push(newItem);
    return newItem;
  }

  static leaveQueue(id: string): { success: boolean } {
    const index = db.queueItems.findIndex((q) => q.id === id);
    if (index === -1) return { success: false };

    const item = db.queueItems[index];
    const softwareId = item.softwareId;

    db.queueItems.splice(index, 1);

    db.queueItems = db.queueItems.map((q) => {
      if (q.softwareId === softwareId && q.position > item.position) {
        return { ...q, position: q.position - 1 };
      }
      return q;
    });

    this.updateEstimatedWaitTimes(softwareId);

    return { success: true };
  }

  static updateEstimatedWaitTimes(softwareId: string): void {
    const software = db.softwareList.find((s) => s.id === softwareId);
    if (!software) return;

    const avgUsageHours = software.averageUsageHours;

    db.queueItems = db.queueItems.map((item) => {
      if (item.softwareId === softwareId) {
        const occupiedSeats = db.seats.filter(
          (s) => s.softwareId === softwareId && s.status === 'occupied'
        );
        let minRemainingTime = Infinity;

        occupiedSeats.forEach((seat) => {
          if (seat.expiresAt) {
            const remaining = (new Date(seat.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
            if (remaining > 0 && remaining < minRemainingTime) {
              minRemainingTime = remaining;
            }
          }
        });

        const baseWaitTime = item.position * avgUsageHours;
        const adjustedWaitTime =
          minRemainingTime !== Infinity && minRemainingTime < baseWaitTime
            ? minRemainingTime + (item.position - 1) * avgUsageHours
            : baseWaitTime;

        return {
          ...item,
          estimatedWaitTime: Math.max(0.5, Math.round(adjustedWaitTime * 10) / 10),
        };
      }
      return item;
    });
  }

  static getNextInQueue(softwareId: string): QueueItem | null {
    const items = db.queueItems
      .filter((q) => q.softwareId === softwareId)
      .sort((a, b) => a.position - b.position);

    return items[0] || null;
  }

  static getQueueLength(softwareId: string): number {
    return db.queueItems.filter((q) => q.softwareId === softwareId).length;
  }

  static getTotalQueueLength(): number {
    return db.queueItems.length;
  }

  static updateAllEstimatedWaitTimes(): void {
    const softwareIds = [...new Set(db.queueItems.map((q) => q.softwareId))];
    softwareIds.forEach((id) => this.updateEstimatedWaitTimes(id));
  }
}
