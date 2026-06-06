import { Router } from 'express';
import { authenticateToken, requireRole, type AuthRequest } from '../middleware/auth';
import { SoftwareService } from '../services/SoftwareService';
import { db } from '../database';
import type { Software, Seat } from '../../shared/types';

const router = Router();

router.get('/', authenticateToken, (req, res) => {
  const { category, page, pageSize } = req.query;
  const result = SoftwareService.getAll(
    category as string,
    parseInt(page as string) || 1,
    parseInt(pageSize as string) || 20
  );

  res.json({
    success: true,
    data: result.data,
    total: result.total,
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  const software = SoftwareService.getById(req.params.id);

  if (!software) {
    return res.status(404).json({
      success: false,
      message: '软件不存在',
    });
  }

  res.json({
    success: true,
    data: software,
  });
});

router.post('/', authenticateToken, requireRole('admin'), (req: AuthRequest, res) => {
  const softwareData = req.body as Omit<Software, 'id' | 'usedSeats' | 'createdAt' | 'averageUsageHours'>;

  if (!softwareData.name || !softwareData.category || !softwareData.totalSeats) {
    return res.status(400).json({
      success: false,
      message: '请提供必要的软件信息',
    });
  }

  const newSoftware = SoftwareService.create(softwareData);

  res.status(201).json({
    success: true,
    data: newSoftware,
    message: '软件创建成功',
  });
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const updates = req.body as Partial<Software>;
  const updated = SoftwareService.update(req.params.id, updates);

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: '软件不存在',
    });
  }

  res.json({
    success: true,
    data: updated,
    message: '软件更新成功',
  });
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const result = SoftwareService.delete(req.params.id);

  if (!result.success) {
    return res.status(404).json({
      success: false,
      message: '软件不存在',
    });
  }

  res.json({
    success: true,
    message: '软件删除成功',
  });
});

router.get('/:id/seats', authenticateToken, requireRole('admin'), (req, res) => {
  const seats = db.seats.filter((s) => s.softwareId === req.params.id);

  res.json({
    success: true,
    data: seats,
    total: seats.length,
  });
});

router.post('/:id/seats', authenticateToken, requireRole('admin'), (req, res) => {
  const software = SoftwareService.getById(req.params.id);
  if (!software) {
    return res.status(404).json({
      success: false,
      message: '软件不存在',
    });
  }

  const newSeat: Seat = {
    id: db.generateId('seat'),
    softwareId: req.params.id,
    licenseKey: `${software.name.toUpperCase().replace(/\s/g, '')}-${String(software.totalSeats + 1).padStart(4, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    status: 'available',
  };

  db.seats.push(newSeat);
  software.totalSeats += 1;

  res.status(201).json({
    success: true,
    data: newSeat,
    message: '席位添加成功',
  });
});

router.put('/:id/seats/:seatId', authenticateToken, requireRole('admin'), (req, res) => {
  const { status } = req.body;
  const seat = db.seats.find((s) => s.id === req.params.seatId && s.softwareId === req.params.id);

  if (!seat) {
    return res.status(404).json({
      success: false,
      message: '席位不存在',
    });
  }

  if (status === 'maintenance' && seat.status === 'occupied') {
    return res.status(400).json({
      success: false,
      message: '已占用的席位无法禁用',
    });
  }

  seat.status = status as any;
  SoftwareService.updateUsedSeats(req.params.id);

  res.json({
    success: true,
    data: seat,
    message: '席位状态更新成功',
  });
});

export default router;
