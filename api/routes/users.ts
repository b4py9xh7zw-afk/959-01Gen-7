import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserService } from '../services/UserService';
import type { User, UserRole, UserStatus } from '../../shared/types';

const router = Router();

router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { page, pageSize, role, status, department, search } = req.query;

  const result = UserService.getAll(
    parseInt(page as string) || 1,
    parseInt(pageSize as string) || 50,
    role as string,
    status as string,
    department as string,
    search as string
  );

  res.json({
    success: true,
    data: result.data,
    total: result.total,
  });
});

router.get('/departments', authenticateToken, (req, res) => {
  const departments = UserService.getDepartments();

  res.json({
    success: true,
    data: departments,
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  const user = UserService.getById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在',
    });
  }

  res.json({
    success: true,
    data: user,
  });
});

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const userData = req.body as Omit<User, 'id' | 'createdAt' | 'status'> & { password: string };

  if (!userData.name || !userData.email || !userData.role || !userData.password || !userData.department) {
    return res.status(400).json({
      success: false,
      message: '请提供完整的用户信息',
    });
  }

  const existingUser = UserService.getAll(1, 1).data.find((u) => u.email === userData.email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: '该邮箱已被注册',
    });
  }

  const newUser = UserService.create(userData);

  res.status(201).json({
    success: true,
    data: newUser,
    message: '用户创建成功',
  });
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const updates = req.body as Partial<User>;
  const updated = UserService.update(req.params.id, updates);

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: '用户不存在',
    });
  }

  res.json({
    success: true,
    data: updated,
    message: '用户信息已更新',
  });
});

router.put('/:id/role', authenticateToken, requireRole('admin'), (req, res) => {
  const { role } = req.body as { role: UserRole };

  if (!role) {
    return res.status(400).json({
      success: false,
      message: '请提供角色',
    });
  }

  const updated = UserService.updateRole(req.params.id, role);

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: '用户不存在',
    });
  }

  res.json({
    success: true,
    data: updated,
    message: '用户角色已更新',
  });
});

router.put('/:id/status', authenticateToken, requireRole('admin'), (req, res) => {
  const { status } = req.body as { status: UserStatus };

  if (!status) {
    return res.status(400).json({
      success: false,
      message: '请提供状态',
    });
  }

  const updated = UserService.updateStatus(req.params.id, status);

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: '用户不存在',
    });
  }

  res.json({
    success: true,
    data: updated,
    message: status === 'graduated' || status === 'resigned'
      ? '用户状态已更新，相关授权已自动回收'
      : '用户状态已更新',
  });
});

export default router;
