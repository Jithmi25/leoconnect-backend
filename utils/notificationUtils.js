// utils/notificationUtils.js
const User = require('../models/User');
const Expo = require('expo-server-sdk').default;

// Initialize Expo SDK
const expo = new Expo();

/**
 * Send push notification to user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification object
 * @returns {Promise<Object>} Send result
 */
const sendPushNotification = async (userId, notification) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.expoPushToken) {
      return { success: false, error: 'User or push token not found' };
    }

    const { expoPushToken } = user;

    // Check that all push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error(`Push token ${expoPushToken} is not a valid Expo push token`);
      return { success: false, error: 'Invalid push token' };
    }

    // Construct the message
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      ...(notification.badge && { badge: notification.badge }),
      ...(notification.channelId && { channelId: notification.channelId })
    };

    // Send the notification
    const receipt = await expo.sendPushNotificationsAsync([message]);
    
    console.log(`📱 Push notification sent to user ${userId}:`, receipt);

    return {
      success: true,
      receipt,
      message: 'Notification sent successfully'
    };

  } catch (error) {
    console.error('❌ Push notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send push notification to multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notification - Notification object
 * @returns {Promise<Object>} Send results
 */
const sendBulkPushNotifications = async (userIds, notification) => {
  try {
    const users = await User.find({ _id: { $in: userIds } });
    const validTokens = users
      .filter(user => user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken))
      .map(user => user.expoPushToken);

    if (validTokens.length === 0) {
      return { success: false, error: 'No valid push tokens found' };
    }

    // Create messages for all tokens
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {}
    }));

    // Send notifications in chunks (Expo limit: 100 messages per request)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }

    console.log(`📱 Bulk push notifications sent to ${validTokens.length} users`);

    return {
      success: true,
      sentCount: validTokens.length,
      tickets,
      message: `Notifications sent to ${validTokens.length} users`
    };

  } catch (error) {
    console.error('❌ Bulk push notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send notification to users in specific club/district
 * @param {string} club - Club name
 * @param {string} district - District name
 * @param {Object} notification - Notification object
 * @returns {Promise<Object>} Send results
 */
const sendNotificationToClub = async (club, district, notification) => {
  try {
    const users = await User.find({
      club,
      district,
      isActive: true,
      expoPushToken: { $exists: true, $ne: null }
    });

    const userIds = users.map(user => user._id);
    return await sendBulkPushNotifications(userIds, notification);

  } catch (error) {
    console.error('❌ Club notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Handle notification receipts
 * @param {Array} receiptIds - Array of receipt IDs
 * @returns {Promise<Object>} Receipt details
 */
const handleNotificationReceipts = async (receiptIds) => {
  try {
    const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);
    
    const results = {
      delivered: 0,
      failed: 0,
      errors: []
    };

    // The receipts specify whether Apple or Google successfully received the
    // notification and whether it was delivered to the device or an error occurred.
    for (const receiptId in receipts) {
      const { status, message, details } = receipts[receiptId];
      
      if (status === 'ok') {
        results.delivered++;
      } else {
        results.failed++;
        results.errors.push({
          receiptId,
          error: message,
          details
        });
        
        // Handle specific errors
        if (status === 'error') {
          if (message === 'DeviceNotRegistered') {
            // Remove the push token from database
            await handleInvalidToken(receiptId);
          }
        }
      }
    }

    console.log(`📊 Notification receipts: ${results.delivered} delivered, ${results.failed} failed`);

    return {
      success: true,
      results
    };

  } catch (error) {
    console.error('❌ Receipt handling error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Handle invalid push token (remove from user)
 * @param {string} receiptId - Receipt ID (push token)
 */
const handleInvalidToken = async (receiptId) => {
  try {
    await User.updateOne(
      { expoPushToken: receiptId },
      { $unset: { expoPushToken: 1 } }
    );
    console.log(`🗑️ Removed invalid push token: ${receiptId}`);
  } catch (error) {
    console.error('Error removing invalid token:', error);
  }
};

/**
 * Create notification object for different event types
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @returns {Object} Formatted notification
 */
const createNotification = (type, data) => {
  const baseNotification = {
    data: {
      type,
      timestamp: new Date().toISOString(),
      ...data
    }
  };

  switch (type) {
    case 'new_post':
      return {
        ...baseNotification,
        title: 'New Post',
        body: `New post in ${data.club}: ${data.title}`,
        data: {
          ...baseNotification.data,
          screen: 'PostDetail',
          postId: data.postId
        }
      };

    case 'new_event':
      return {
        ...baseNotification,
        title: 'New Event',
        body: `New event: ${data.eventTitle}`,
        data: {
          ...baseNotification.data,
          screen: 'EventDetail',
          eventId: data.eventId
        }
      };

    case 'event_reminder':
      return {
        ...baseNotification,
        title: 'Event Reminder',
        body: `Don't forget: ${data.eventTitle} starts soon!`,
        data: {
          ...baseNotification.data,
          screen: 'EventDetail',
          eventId: data.eventId
        }
      };

    case 'service_hours_approved':
      return {
        ...baseNotification,
        title: 'Service Hours Approved',
        body: `Your ${data.hours} service hours have been approved!`,
        data: {
          ...baseNotification.data,
          screen: 'Profile'
        }
      };

    case 'new_badge':
      return {
        ...baseNotification,
        title: 'New Badge Earned!',
        body: `You earned the ${data.badgeName} badge!`,
        data: {
          ...baseNotification.data,
          screen: 'Profile'
        }
      };

    case 'mention':
      return {
        ...baseNotification,
        title: 'You were mentioned',
        body: `${data.mentionedBy} mentioned you in a post`,
        data: {
          ...baseNotification.data,
          screen: 'PostDetail',
          postId: data.postId
        }
      };

    case 'new_poll':
      return {
        ...baseNotification,
        title: 'New Poll',
        body: `New poll: ${data.pollQuestion}`,
        data: {
          ...baseNotification.data,
          screen: 'PollDetail',
          pollId: data.pollId
        }
      };

    default:
      return {
        ...baseNotification,
        title: data.title || 'LeoConnect',
        body: data.body || 'You have a new notification',
        data: baseNotification.data
      };
  }
};

/**
 * Schedule a notification for later delivery
 * @param {string} userId - User ID
 * @param {Object} notification - Notification object
 * @param {Date} deliverAt - When to deliver
 * @returns {Promise<Object>} Scheduling result
 */
const scheduleNotification = async (userId, notification, deliverAt) => {
  try {
    // In a real implementation, you'd use a job queue like Bull or Agenda
    // For now, we'll store it in the database and have a separate worker process it
    
    const ScheduledNotification = require('../models/ScheduledNotification');
    
    const scheduledNotif = await ScheduledNotification.create({
      user: userId,
      notification,
      deliverAt,
      status: 'scheduled'
    });

    console.log(`⏰ Notification scheduled for ${deliverAt}:`, scheduledNotif._id);

    return {
      success: true,
      scheduledId: scheduledNotif._id,
      message: 'Notification scheduled successfully'
    };

  } catch (error) {
    console.error('❌ Schedule notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get user notification preferences
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notification preferences
 */
const getUserNotificationPreferences = async (userId) => {
  try {
    const user = await User.findById(userId).select('notificationPreferences');
    
    const defaultPreferences = {
      newPosts: true,
      newEvents: true,
      eventReminders: true,
      serviceHours: true,
      badges: true,
      mentions: true,
      polls: true,
      push: true,
      email: false
    };

    return {
      ...defaultPreferences,
      ...(user.notificationPreferences || {})
    };

  } catch (error) {
    console.error('❌ Get notification preferences error:', error);
    return null;
  }
};

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
  sendNotificationToClub,
  handleNotificationReceipts,
  handleInvalidToken,
  createNotification,
  scheduleNotification,
  getUserNotificationPreferences
};