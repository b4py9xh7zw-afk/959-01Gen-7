import { Router } from 'express';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { QueueService } from '../services/QueueService';

const router = Router();

router.get('/:softwareId', authenticateToken, (req: AuthRequest, res) => {
  const { softwareId } = req.params;
  const currentUserId = req.user!.userId;

  const result = QueueService.getQueue(softwareId, currentUserId);

  res.json({
    success: true,
    data: result,
  });
});

router.post('/', authenticateToken, (req: AuthRequest, res) => {
  const { softwareId, applicationId } = req.body;
  const userId = req.user!.userId;

  if (!softwareId || !applicationId) {
    return res.status(400).json({
      success: false,
      message: '请提供软件ID和申请ID',
    });
  }

  const queueItem = QueueService.joinQueue(softwareId, userId, applicationId);

  if (!queueItem) {
    return res.status(400).json({
      success: false,
      message: '您已在排队队列中',
    });
  }

  res.status(201).json({
    success: true,
    data: queueItem,
    message: '已加入排队',
  });
});

router.delete('/:id', authenticateToken, (req: AuthRequest, res) => {
  const result = QueueService.leaveQueue(req.params.id);

  if (!result.success) {
    return res.status(404).json({
      success: false,
      message: '排队记录不存在',
    });
  }

  res.json({
    success: true,
    message: '已取消排队',
  });
});

router.put('/update-estimates', authenticateToken, (req, res) => {
  QueueService.updateAllEstimatedWaitTimes();

  res.json({
    success: true,
    message: '预计等待时间已更新',
  });
});

export default router;
