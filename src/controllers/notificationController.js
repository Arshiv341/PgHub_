import Notification from '../models/Notification.js';

/**
 * Helper utility to log a notification in database.
 */
export const createNotification = async (ownerId, message, type = 'system') => {
  try {
    await Notification.create({ ownerId, message, type });
  } catch (error) {
    console.error('Failed to log system notification:', error);
  }
};

/**
 * Fetch all notifications (isolated by ownerId).
 */
export const getNotifications = async (req, res, next) => {
  const ownerId = req.user.id;

  try {
    const notifications = await Notification.find({ ownerId })
      .sort({ createdAt: -1 })
      .limit(50); // Cap at 50 most recent notifications

    res.status(200).json({
      message: 'Notifications fetched successfully',
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification counts (isolated by ownerId).
 */
export const getUnreadCount = async (req, res, next) => {
  const ownerId = req.user.id;

  try {
    const count = await Notification.countDocuments({ ownerId, isRead: false });
    res.status(200).json({
      message: 'Unread notifications count fetched',
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a specific notification as Read.
 */
export const markAsRead = async (req, res, next) => {
  const { id } = req.params;
  const ownerId = req.user.id;

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, ownerId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as Read.
 */
export const markAllAsRead = async (req, res, next) => {
  const ownerId = req.user.id;

  try {
    await Notification.updateMany({ ownerId, isRead: false }, { isRead: true });
    res.status(200).json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};
