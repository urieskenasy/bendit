import { Maintenance, Property, Building, Supplier, Document, Reminder } from '@/api/entities';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';

/**
 * מודול לסנכרון וטיפול בקשרים של ישות תחזוקה
 */

// פונקציה ראשית לסנכרון תחזוקה
export default async function syncMaintenance(maintenance) {
  try {
    console.log("Starting maintenance sync for:", maintenance);
    
    // 1. עדכון ישות קשורה (נכס או בניין)
    await updateRelatedEntity(maintenance);
    
    // 2. יצירת/עדכון תזכורות
    await createMaintenanceReminders(maintenance);
    
    // 3. בדיקת נתוני ספק וסנכרון עימם
    await syncWithSupplier(maintenance);
    
    // 4. עדכון בדשבורד אם הושלם
    if (maintenance.status === 'completed') {
      await updateDashboardStats(maintenance);
    }
    
    console.log("Maintenance sync completed successfully");
  } catch (error) {
    console.error("Error in maintenance sync:", error);
    throw error;
  }
}

// עדכון הישות הקשורה (נכס או בניין)
async function updateRelatedEntity(maintenance) {
  try {
    if (!maintenance.related_to) return;
    
    const { type, id } = maintenance.related_to;
    
    if (type === 'property') {
      await updatePropertyMaintenanceHistory(id, maintenance);
    } else if (type === 'building') {
      await updateBuildingMaintenanceHistory(id, maintenance);
    }
  } catch (error) {
    console.error("Error updating related entity:", error);
    throw error;
  }
}

// עדכון היסטוריית תחזוקה של נכס
async function updatePropertyMaintenanceHistory(propertyId, maintenance) {
  try {
    const property = await Property.get(propertyId);
    if (!property) {
      console.log(`Property ${propertyId} not found`);
      return;
    }
    
    // נשמור את המידע על תחזוקה אחרונה בנכס
    const maintenanceInfo = {
      maintenance_id: maintenance.id,
      type: maintenance.type,
      description: maintenance.title,
      status: maintenance.status,
      date: maintenance.reported_date || new Date().toISOString(),
      cost: maintenance.cost || 0
    };
    
    const maintenanceHistory = property.maintenance_history || [];
    
    // בדוק אם כבר קיים רישום על התחזוקה הזו
    const existingIndex = maintenanceHistory.findIndex(m => m.maintenance_id === maintenance.id);
    
    if (existingIndex >= 0) {
      // עדכון רשומה קיימת
      maintenanceHistory[existingIndex] = maintenanceInfo;
    } else {
      // הוספת רשומה חדשה
      maintenanceHistory.push(maintenanceInfo);
    }
    
    // עדכון הנכס
    await Property.update(propertyId, {
      ...property,
      maintenance_history: maintenanceHistory,
      last_maintenance_date: maintenance.completed_date || maintenance.reported_date || new Date().toISOString()
    });
    
    console.log(`Property ${propertyId} maintenance history updated`);
  } catch (error) {
    console.error(`Error updating property ${propertyId} maintenance history:`, error);
    throw error;
  }
}

// עדכון היסטוריית תחזוקה של בניין
async function updateBuildingMaintenanceHistory(buildingId, maintenance) {
  try {
    const building = await Building.get(buildingId);
    if (!building) {
      console.log(`Building ${buildingId} not found`);
      return;
    }
    
    // נשמור את המידע על תחזוקה אחרונה בבניין
    const maintenanceInfo = {
      maintenance_id: maintenance.id,
      type: maintenance.type,
      description: maintenance.title,
      status: maintenance.status,
      date: maintenance.reported_date || new Date().toISOString(),
      cost: maintenance.cost || 0
    };
    
    const maintenanceHistory = building.maintenance_history || [];
    
    // בדוק אם כבר קיים רישום על התחזוקה הזו
    const existingIndex = maintenanceHistory.findIndex(m => m.maintenance_id === maintenance.id);
    
    if (existingIndex >= 0) {
      // עדכון רשומה קיימת
      maintenanceHistory[existingIndex] = maintenanceInfo;
    } else {
      // הוספת רשומה חדשה
      maintenanceHistory.push(maintenanceInfo);
    }
    
    // עדכון הבניין
    await Building.update(buildingId, {
      ...building,
      maintenance_history: maintenanceHistory,
      last_maintenance_date: maintenance.completed_date || maintenance.reported_date || new Date().toISOString()
    });
    
    console.log(`Building ${buildingId} maintenance history updated`);
  } catch (error) {
    console.error(`Error updating building ${buildingId} maintenance history:`, error);
    throw error;
  }
}

// יצירת תזכורות הקשורות לתחזוקה
async function createMaintenanceReminders(maintenance) {
  try {
    const existingReminders = await Reminder.list();
    
    // בדיקה האם קיימת תזכורת למעקב אחר התחזוקה
    const followupReminder = existingReminders.find(r => 
      r.related_to?.type === 'maintenance' && 
      r.related_to?.id === maintenance.id &&
      r.type === 'maintenance_followup'
    );
    
    // טיפול בהתאם לסטטוס התחזוקה
    if (maintenance.status === 'open' || maintenance.status === 'in_progress') {
      if (!followupReminder) {
        // נצור תזכורת חדשה למעקב
        let reminderDate;
        if (maintenance.scheduled_date) {
          // תאריך המתוכנן, אם קיים
          reminderDate = parseISO(maintenance.scheduled_date);
        } else {
          // אחרת יום אחד מהיום
          reminderDate = addDays(new Date(), 1);
        }
        
        // קביעת עדיפות התזכורת בהתאם לדחיפות התחזוקה
        let reminderPriority = 'medium';
        if (maintenance.priority === 'urgent' || maintenance.priority === 'high') {
          reminderPriority = 'high';
        }
        
        await Reminder.create({
          title: `מעקב תחזוקה: ${maintenance.title}`,
          description: `יש לבדוק את סטטוס הטיפול בבקשת התחזוקה: ${maintenance.description}`,
          type: 'maintenance_followup',
          related_to: {
            type: 'maintenance',
            id: maintenance.id
          },
          date: format(reminderDate, 'yyyy-MM-dd'),
          status: 'active',
          priority: reminderPriority
        });
        
        console.log(`Maintenance followup reminder created for maintenance ${maintenance.id}`);
      }
    } else if (maintenance.status === 'completed' && followupReminder) {
      // אם התחזוקה הושלמה וקיימת תזכורת מעקב, עדכן אותה לסטטוס "הושלם"
      await Reminder.update(followupReminder.id, {
        ...followupReminder,
        status: 'completed'
      });
      
      console.log(`Maintenance followup reminder ${followupReminder.id} marked as completed`);
      
      // יצירת תזכורת לבדיקה תקופתית אם מדובר בתחזוקה תקופתית
      if (maintenance.type === 'inspection' || maintenance.type === 'maintenance') {
        // בדיקה אם קיימת תזכורת לבדיקה תקופתית
        const periodicReminder = existingReminders.find(r => 
          r.related_to?.type === 'maintenance' && 
          r.related_to?.id === maintenance.id &&
          r.type === 'periodic_maintenance'
        );
        
        if (!periodicReminder) {
          // קביעת תאריך התזכורת הבאה (3 חודשים מתאריך הסיום)
          const nextDate = addDays(new Date(), 90);
          
          await Reminder.create({
            title: `תחזוקה תקופתית: ${getTitleByMaintenanceType(maintenance.type)}`,
            description: `יש לבצע בדיקה תקופתית ל${getEntityDescription(maintenance.related_to)}`,
            type: 'periodic_maintenance',
            related_to: {
              type: 'maintenance',
              id: maintenance.id
            },
            date: format(nextDate, 'yyyy-MM-dd'),
            status: 'active',
            is_recurring: true,
            recurrence_pattern: 'quarterly',
            priority: 'medium'
          });
          
          console.log(`Periodic maintenance reminder created for maintenance ${maintenance.id}`);
        }
      }
    }
  } catch (error) {
    console.error("Error creating maintenance reminders:", error);
    throw error;
  }
}

// סנכרון עם ספק
async function syncWithSupplier(maintenance) {
  try {
    if (!maintenance.supplier_id) return;
    
    const supplier = await Supplier.get(maintenance.supplier_id);
    if (!supplier) {
      console.log(`Supplier ${maintenance.supplier_id} not found`);
      return;
    }
    
    // עדכון ספק עם מידע על תחזוקה אחרונה
    const maintenanceInfo = {
      maintenance_id: maintenance.id,
      type: maintenance.type,
      description: maintenance.title,
      status: maintenance.status,
      date: maintenance.reported_date || new Date().toISOString(),
      cost: maintenance.cost || 0,
      related_entity: getEntityDescription(maintenance.related_to)
    };
    
    const maintenanceHistory = supplier.maintenance_history || [];
    
    // בדוק אם כבר קיים רישום על התחזוקה הזו
    const existingIndex = maintenanceHistory.findIndex(m => m.maintenance_id === maintenance.id);
    
    if (existingIndex >= 0) {
      // עדכון רשומה קיימת
      maintenanceHistory[existingIndex] = maintenanceInfo;
    } else {
      // הוספת רשומה חדשה
      maintenanceHistory.push(maintenanceInfo);
    }
    
    // עדכון הספק
    await Supplier.update(supplier.id, {
      ...supplier,
      maintenance_history: maintenanceHistory,
      total_jobs: (supplier.total_jobs || 0) + (existingIndex >= 0 ? 0 : 1),
      last_service_date: maintenance.completed_date || maintenance.reported_date || new Date().toISOString()
    });
    
    console.log(`Supplier ${supplier.id} updated with maintenance ${maintenance.id}`);
  } catch (error) {
    console.error(`Error syncing with supplier for maintenance ${maintenance.id}:`, error);
    throw error;
  }
}

// עדכון נתוני דשבורד
async function updateDashboardStats(maintenance) {
  try {
    // לוגיקה זו תשתנה בהתאם למבנה הדשבורד שלך
    console.log("Dashboard stats would be updated here");
    
    // דוגמה: עדכון נתוני UserDashboard (אם קיים)
    // const dashboards = await UserDashboard.list();
    // עדכון הסטטיסטיקות המתאימות
  } catch (error) {
    console.error("Error updating dashboard stats:", error);
    // לא נזרוק שגיאה כדי לא לעצור את התהליך כולו
  }
}

// יצירת תיעוד עבור סיום התחזוקה
export async function createMaintenanceCompletionDocument(maintenance, fileUrl) {
  try {
    if (!maintenance || !fileUrl) {
      throw new Error("Maintenance and file URL are required");
    }
    
    // יצירת מסמך סיום עבודה
    const document = {
      type: 'work_completion',
      number: `MAINT-${maintenance.id}`,
      date: maintenance.completed_date || format(new Date(), 'yyyy-MM-dd'),
      related_to: {
        type: 'maintenance',
        id: maintenance.id
      },
      file_url: fileUrl,
      status: 'final',
      amount: maintenance.cost,
      notes: `אישור סיום עבודה לתחזוקה: ${maintenance.title}`
    };
    
    const savedDocument = await Document.create(document);
    console.log(`Maintenance completion document created with ID: ${savedDocument.id}`);
    
    // עדכון התחזוקה עם מזהה המסמך
    await Maintenance.update(maintenance.id, {
      ...maintenance,
      document_id: savedDocument.id,
      status: 'completed',
      completed_date: format(new Date(), 'yyyy-MM-dd')
    });
    
    return savedDocument;
  } catch (error) {
    console.error("Error creating maintenance completion document:", error);
    throw error;
  }
}

// עדכון משך זמן טיפול בתחזוקה
export async function updateMaintenanceMetrics(maintenance) {
  try {
    if (!maintenance.completed_date || !maintenance.reported_date) return maintenance;
    
    const reportedDate = parseISO(maintenance.reported_date);
    const completedDate = parseISO(maintenance.completed_date);
    
    // חישוב משך זמן הטיפול בימים
    const daysToComplete = differenceInDays(completedDate, reportedDate);
    
    // עדכון הנתונים
    const updatedMaintenance = await Maintenance.update(maintenance.id, {
      ...maintenance,
      metrics: {
        ...(maintenance.metrics || {}),
        days_to_complete: daysToComplete,
        completion_time: daysToComplete * 24 // בשעות
      }
    });
    
    console.log(`Maintenance ${maintenance.id} metrics updated: ${daysToComplete} days to complete`);
    return updatedMaintenance;
  } catch (error) {
    console.error("Error updating maintenance metrics:", error);
    return maintenance;
  }
}

// פונקציות עזר

// מחזיר כותרת בהתאם לסוג התחזוקה
function getTitleByMaintenanceType(type) {
  const types = {
    'maintenance': 'תחזוקה שוטפת',
    'repair': 'תיקון',
    'renovation': 'שיפוץ',
    'cleaning': 'ניקיון',
    'inspection': 'בדיקה',
    'other': 'אחר'
  };
  return types[type] || type;
}

// מחזיר תיאור של הישות המקושרת
function getEntityDescription(relatedTo) {
  if (!relatedTo) return '';
  
  switch (relatedTo.type) {
    case 'property':
      return `נכס ${relatedTo.id}`;
    case 'building':
      return `בניין ${relatedTo.id}`;
    default:
      return `${relatedTo.type} ${relatedTo.id}`;
  }
}

// מייצא פונקציות נוספות
export {
  updateRelatedEntity,
  createMaintenanceReminders,
  syncWithSupplier
  // updateMaintenanceMetrics // הוסר כי כבר מיוצא למעלה
};