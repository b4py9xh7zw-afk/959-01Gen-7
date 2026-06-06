import { Router } from 'express';
import { authenticateToken, requireRole, type AuthRequest } from '../middleware/auth';
import { LicenseService } from '../services/LicenseService';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { userId, softwareId, status, page, pageSize } = req.query;

  const targetUserId = userId || (req.user?.role !== 'admin' ? req.user?.userId : undefined);

  const result = LicenseService.getAll(
    parseInt(page as string) || 1,
    parseInt(pageSize as string) || 20,
    targetUserId as string,
    softwareId as string,
    status as string
  );

  res.json({
    success: true,
    data: result.data,
    total: result.total,
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  const license = LicenseService.getById(req.params.id);

  if (!license) {
    return res.status(404).json({
      success: false,
      message: '授权不存在',
    });
  }

  res.json({
    success: true,
    data: license,
  });
});

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { userId, softwareId, applicationId, startDate, endDate } = req.body;

  if (!userId || !softwareId || !applicationId || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: '请提供完整的授权信息',
    });
  }

  const license = LicenseService.create(userId, softwareId, applicationId, startDate, endDate);

  if (!license) {
    return res.status(400).json({
      success: false,
      message: '暂无可用席位',
    });
  }

  res.status(201).json({
    success: true,
    data: license,
    message: '授权创建成功',
  });
});

router.put('/:id/revoke', authenticateToken, requireRole('admin'), (req, res) => {
  const license = LicenseService.revoke(req.params.id);

  if (!license) {
    return res.status(404).json({
      success: false,
      message: '授权不存在',
    });
  }

  res.json({
    success: true,
    data: license,
    message: '授权已收回',
  });
});

router.put('/:id/renew', authenticateToken, (req, res) => {
  const { endDate } = req.body;

  if (!endDate) {
    return res.status(400).json({
      success: false,
      message: '请提供新的到期日期',
    });
  }

  const license = LicenseService.renew(req.params.id, endDate);

  if (!license) {
    return res.status(404).json({
      success: false,
      message: '授权不存在',
    });
  }

  res.json({
    success: true,
    data: license,
    message: '授权已续期',
  });
});

router.put('/:id/return', authenticateToken, (req: AuthRequest, res) => {
  const license = LicenseService.getById(req.params.id);

  if (!license) {
    return res.status(404).json({
      success: false,
      message: '授权不存在',
    });
  }

  if (license.userId !== req.user!.userId && req.user!.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '无权归还此授权',
    });
  }

  const returned = LicenseService.returnLicense(req.params.id);

  res.json({
    success: true,
    data: returned,
    message: '授权已归还',
  });
});

router.put('/:id/checkout', authenticateToken, (req: AuthRequest, res) => {
  const license = LicenseService.checkoutLicense(req.params.id);

  if (!license) {
    return res.status(404).json({
      success: false,
      message: '授权不存在或未激活',
    });
  }

  res.json({
    success: true,
    data: license,
    message: '已检出授权',
  });
});

router.put('/:id/checkin', authenticateToken, (req: AuthRequest, res) => {
  const license = LicenseService.checkinLicense(req.params.id);

  if (!license) {
    return res.status(404).json({
      success: false,
      message: '授权不存在',
    });
  }

  res.json({
    success: true,
    data: license,
    message: '已归还授权',
  });
});

router.put('/revoke-expired', authenticateToken, requireRole('admin'), (req, res) => {
  const count = LicenseService.revokeExpiredLicenses();

  res.json({
    success: true,
    data: { count },
    message: `已回收 ${count} 个过期授权`,
  });
});

export default router;
