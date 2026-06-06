import jwt from 'jsonwebtoken';
import { db } from '../database';
import type { User, LoginRequest, LoginResponse } from '../../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'software-pool-secret-key-2024';

export class AuthService {
  static login(request: LoginRequest): LoginResponse | null {
    const user = db.users.find(
      (u) => u.email === request.email && u.password === request.password
    );

    if (!user) {
      return null;
    }

    if (user.status === 'graduated' || user.status === 'resigned') {
      return null;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }

  static verifyToken(token: string): { userId: string; role: string; email: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; email: string };
    } catch {
      return null;
    }
  }

  static getUserById(userId: string): User | null {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static logout(): { success: boolean } {
    return { success: true };
  }
}
