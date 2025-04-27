/**
 * שירות רישום פעולות במערכת (Logging Service)
 */

import { SystemLog } from '@/api/entities';

// סוגי לוגים
export const LogTypes = {
  ENTITY_CREATED: 'entity_created',
  ENTITY_UPDATED: 'entity_updated',
  ENTITY_DELETED: 'entity_deleted',
  SYNC_STARTED: 'sync_started',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
  PAYMENT_GENERATED: 'payment_generated',
  REMINDER_TRIGGERED: 'reminder_triggered',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// רמות חומרה
export const LogSeverity = {
  VERBOSE: 'verbose',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * הוספת רישום למערכת
 * @param {string} type - סוג הרישום (מתוך LogTypes)
 * @param {string} message - הודעה מפורטת
 * @param {object} details - פרטים נוספים (אופציונלי)
 * @param {string} severity - רמת חומרה (מתוך LogSeverity)
 * @param {object} related_entities - ישויות קשורות (אופציונלי)
 * @returns {Promise} - רשומת הלוג החדשה
 */
export async function logEvent(type, message, details = {}, severity = LogSeverity.INFO, related_entities = {}) {
  try {
    // אם המערכת לא בפרודקשן, נדפיס ללוג של הקונסול
    console.log(`[${severity.toUpperCase()}] ${type}: ${message}`, details, related_entities);
    
    // כתיבה למסד הנתונים
    const logEntry = {
      type,
      message,
      details: JSON.stringify(details),
      severity,
      related_entities: JSON.stringify(related_entities),
      timestamp: new Date().toISOString()
    };
    
    return await SystemLog.create(logEntry);
  } catch (error) {
    // במקרה של שגיאה ברישום, לפחות נוודא שיש תיעוד בקונסול
    console.error('Error writing to system log:', error);
    console.error('Original log data:', { type, message, details, severity, related_entities });
    return null;
  }
}

/**
 * רישום התחלת תהליך סנכרון
 */
export async function logSyncStarted(source, target, details = {}) {
  return logEvent(
    LogTypes.SYNC_STARTED,
    `התחלת סנכרון מ-${source} ל-${target}`,
    details,
    LogSeverity.INFO,
    { source, target }
  );
}

/**
 * רישום סיום מוצלח של תהליך סנכרון
 */
export async function logSyncCompleted(source, target, details = {}) {
  return logEvent(
    LogTypes.SYNC_COMPLETED,
    `סנכרון מ-${source} ל-${target} הושלם בהצלחה`,
    details,
    LogSeverity.INFO,
    { source, target }
  );
}

/**
 * רישום כישלון בתהליך סנכרון
 */
export async function logSyncFailed(source, target, error, details = {}) {
  return logEvent(
    LogTypes.SYNC_FAILED,
    `שגיאה בסנכרון מ-${source} ל-${target}`,
    { ...details, error: error.message, stack: error.stack },
    LogSeverity.ERROR,
    { source, target }
  );
}

/**
 * רישום יצירת ישות
 */
export async function logEntityCreated(entityType, entityId, details = {}) {
  return logEvent(
    LogTypes.ENTITY_CREATED,
    `נוצרה ישות חדשה מסוג ${entityType}`,
    details,
    LogSeverity.INFO,
    { entityType, entityId }
  );
}

/**
 * רישום עדכון ישות
 */
export async function logEntityUpdated(entityType, entityId, changes = {}, details = {}) {
  return logEvent(
    LogTypes.ENTITY_UPDATED,
    `עודכנה ישות מסוג ${entityType}`,
    { ...details, changes },
    LogSeverity.INFO,
    { entityType, entityId }
  );
}

/**
 * רישום מחיקת ישות
 */
export async function logEntityDeleted(entityType, entityId, details = {}) {
  return logEvent(
    LogTypes.ENTITY_DELETED,
    `נמחקה ישות מסוג ${entityType}`,
    details,
    LogSeverity.INFO,
    { entityType, entityId }
  );
}

/**
 * רישום יצירת תשלומים
 */
export async function logPaymentsGenerated(contractId, count, details = {}) {
  return logEvent(
    LogTypes.PAYMENT_GENERATED,
    `נוצרו ${count} תשלומים עבור חוזה ${contractId}`,
    details,
    LogSeverity.INFO,
    { entityType: 'contract', entityId: contractId }
  );
}

/**
 * רישום שגיאה
 */
export async function logError(message, error, context = {}) {
  return logEvent(
    LogTypes.ERROR,
    message,
    { ...context, error: error.message, stack: error.stack },
    LogSeverity.ERROR
  );
}

/**
 * רישום אזהרה
 */
export async function logWarning(message, details = {}) {
  return logEvent(
    LogTypes.WARNING,
    message,
    details,
    LogSeverity.WARNING
  );
}

/**
 * רישום מידע כללי
 */
export async function logInfo(message, details = {}) {
  return logEvent(
    LogTypes.INFO,
    message,
    details,
    LogSeverity.INFO
  );
}

/**
 * שירות הלוגים המייצא את כל הפונקציות
 */
export default {
  LogTypes,
  LogSeverity,
  logEvent,
  logSyncStarted,
  logSyncCompleted,
  logSyncFailed,
  logEntityCreated,
  logEntityUpdated,
  logEntityDeleted,
  logPaymentsGenerated,
  logError,
  logWarning,
  logInfo
};