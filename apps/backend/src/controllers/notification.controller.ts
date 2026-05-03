import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ data: notifications });
  } catch (error) {
    console.error('[Notification Controller] getNotifications error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const notificationId = req.params.id;

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('[Notification Controller] markAsRead error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  }
};
