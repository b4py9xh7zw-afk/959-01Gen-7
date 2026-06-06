import { db } from '../database';
import type { User, UserRole, UserStatus } from '../../shared/types';

export class UserService {
  static getAll(page: number = 1, pageSize: number = 50, role?: string, status?: string, department?: string, search?: string): { data: User[]; total: number } {
    let filtered = [...db.users];

    if (role && role !== 'all') {
      filtered = filtered.filter((u) => u.role === role);
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((u) => u.status === status);
    }

    if (department && department !== 'all') {
      filtered = filtered.filter((u) => u.department === department);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.studentId?.toLowerCase().includes(searchLower) ||
          u.employeeId?.toLowerCase().includes(searchLower)
      );
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize).map(({ password, ...user }) => user);

    return { data, total };
  }

  static getById(id: string): User | null {
    const user = db.users.find((u) => u.id === id);
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static create(user: Omit<User, 'id' | 'createdAt' | 'status'> & { password: string }): User {
    const newUser: User = {
      ...user,
      id: db.generateId('user'),
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  static update(id: string, updates: Partial<User>): User | null {
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    db.users[index] = { ...db.users[index], ...updates };

    if (updates.status === 'graduated' || updates.status === 'resigned') {
      this.revokeUserLicenses(id);
    }

    const { password, ...userWithoutPassword } = db.users[index];
    return userWithoutPassword;
  }

  static updateRole(id: string, role: UserRole): User | null {
    return this.update(id, { role });
  }

  static updateStatus(id: string, status: UserStatus): User | null {
    const user = this.update(id, { status });
    if (user && (status === 'graduated' || status === 'resigned')) {
      this.revokeUserLicenses(id);
    }
    return user;
  }

  private static revokeUserLicenses(userId: string): void {
    db.licenses.forEach((license) => {
      if (license.userId === userId && license.status === 'active') {
        license.status = 'revoked';
        const seat = db.seats.find((s) => s.id === license.seatId);
        if (seat) {
          seat.status = 'available';
          seat.currentUserId = undefined;
          seat.assignedAt = undefined;
          seat.expiresAt = undefined;
        }
        const software = db.softwareList.find((s) => s.id === license.softwareId);
        if (software) {
          software.usedSeats = Math.max(0, software.usedSeats - 1);
        }
      }
    });
  }

  static getDepartments(): string[] {
    return [...new Set(db.users.map((u) => u.department))];
  }
}
