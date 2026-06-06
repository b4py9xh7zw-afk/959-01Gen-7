import { Router } from 'express';
import { authenticateToken, requireRole, type AuthRequest } from '../middleware/auth';
import { ApplicationService } from '../services/ApplicationService';
import { LicenseService } from '../services/LicenseService';
import type { Application } from '../../shared/types';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { status, userId, softwareId, department, page, pageSize } = req.query;

  const targetUserId = userId || (req.user?.role === 'student' ? req.user.userId : undefined);

  const result = ApplicationService.getAll(
    parseInt(page as string) || 1,
    parseInt(pageSize as string) || 20,
    status as string,
    targetUserId as string,
    softwareId as string,
    department as string
  );

  res.json({
    success: true,
    data: result.data,
    total: result.total,
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  const application = ApplicationService.getById(req.params.id);

  if (!application) {
    return res.status(404).json({
      success: false,
      message: '申请不存在',
    });
  }

  res.json({
    success: true,
    data: application,
  });
});

router.post('/', authenticateToken, (req: AuthRequest, res) => {
  const appData = req.body as Omit<Application, 'id' | 'status' | 'createdAt'>;

  if (!appData.softwareId || !appData.purpose || !appData.startDate || !appData.endDate) {
    return res.status(400).json({
      success: false,
      message: '请提供完整的申请信息',
    });
  }

  const application = ApplicationService.create({
    ...appData,
    userId: appData.userId || req.user!.userId,
  });

  res.status(201).json({
    success: true,
    data: application,
    message: '申请提交成功',
  });
});

router.put('/:id/approve', authenticateToken, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const { approverId } = req.body;

  const approved = ApplicationService.approve(
    req.params.id,
    approverId || req.user!.userId
  );

  if (!approved) {
    return res.status(404).json({
      success: false,
      message: '申请不存在',
    });
  }

  const availableSeat = LicenseService.create(
    approved.userId,
    approved.softwareId,
    approved.id,
    approved.startDate,
    approved.endDate
  );

  res.json({
    success: true,
    data: approved,
    message: '审批通过' + (availableSeat ? '，席位已分配' : '，暂无可用席位，已加入排队'),
  });
});

router.put('/:id/reject', authenticateToken, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
  const { approverId, rejectionReason } = req.body;

  if (!rejectionReason) {
    return res.status(400).json({
      success: false,
      message: '请提供拒绝原因',
    });
  }

  const rejected = ApplicationService.reject(
    req.params.id,
    approverId || req.user!.userId,
    rejectionReason
  );

  if (!rejected) {
    return res.status(404).json({
      success: false,
      message: '申请不存在',
    });
  }

  res.json({
    success: true,
    data: rejected,
    message: '已拒绝申请',
  });
});

router.get('/pending/count', authenticateToken, (req: AuthRequest, res) => {
  const { department } = req.query;
  const count = ApplicationService.getPendingCount(department as string);

  res.json({
    success: true,
    data: { count },
  });
});

export default router;
