import { Supplier, Maintenance, Building, Property } from '@/api/entities';

/**
 * מודול לסנכרון וטיפול בקשרים של ישות ספק
 */

// פונקציה ראשית לסנכרון ספק
export default async function syncSupplier(supplier) {
  try {
    console.log("Starting supplier sync for:", supplier);
    
    // 1. עדכון קריאות תחזוקה הקשורות לספק
    await updateRelatedMaintenanceTasks(supplier);
    
    // 2. עדכון שיוך ספק לבניינים ונכסים
    await updateBuildingAndPropertyRelationships(supplier);
    
    console.log("Supplier sync completed successfully");
  } catch (error) {
    console.error("Error in supplier sync:", error);
    throw error;
  }
}

// עדכון קריאות תחזוקה משויכות לספק
async function updateRelatedMaintenanceTasks(supplier) {
  try {
    // מציאת כל קריאות התחזוקה הקשורות לספק
    const maintenanceTasks = await Maintenance.list();
    const relatedTasks = maintenanceTasks.filter(task => task.supplier_id === supplier.id);
    
    if (relatedTasks.length === 0) {
      console.log(`No maintenance tasks found for supplier ${supplier.id}`);
      return;
    }
    
    console.log(`Found ${relatedTasks.length} maintenance tasks related to supplier ${supplier.id}`);
    
    // עדכון פרטי הספק בכל קריאות התחזוקה
    for (const task of relatedTasks) {
      // שמירת הפרטים המעודכנים של הספק בקריאת התחזוקה
      const supplierInfo = {
        id: supplier.id,
        name: supplier.name,
        service_type: supplier.service_type,
        phone: supplier.phone,
        email: supplier.email
      };
      
      await Maintenance.update(task.id, {
        ...task,
        supplier_details: supplierInfo // שמירת פרטי הספק המעודכנים
      });
      
      console.log(`Updated supplier details in maintenance task ${task.id}`);
    }
  } catch (error) {
    console.error("Error updating related maintenance tasks:", error);
    throw error;
  }
}

// עדכון קשרים בין ספק לבניינים ונכסים
async function updateBuildingAndPropertyRelationships(supplier) {
  try {
    // עדכון בניינים הקשורים לספק
    if (supplier.related_buildings && supplier.related_buildings.length > 0) {
      for (const buildingId of supplier.related_buildings) {
        const building = await Building.get(buildingId);
        
        if (building) {
          // בדיקה אם כבר קיים רישום של הספק בבניין
          const supplierIds = building.supplier_ids || [];
          
          if (!supplierIds.includes(supplier.id)) {
            // הוספת הספק לרשימת הספקים של הבניין
            await Building.update(buildingId, {
              ...building,
              supplier_ids: [...supplierIds, supplier.id]
            });
            
            console.log(`Added supplier ${supplier.id} to building ${buildingId}`);
          }
        }
      }
    }
    
    // עדכון נכסים הקשורים לספק
    if (supplier.related_properties && supplier.related_properties.length > 0) {
      for (const propertyId of supplier.related_properties) {
        const property = await Property.get(propertyId);
        
        if (property) {
          // בדיקה אם כבר קיים רישום של הספק בנכס
          const supplierIds = property.supplier_ids || [];
          
          if (!supplierIds.includes(supplier.id)) {
            // הוספת הספק לרשימת הספקים של הנכס
            await Property.update(propertyId, {
              ...property,
              supplier_ids: [...supplierIds, supplier.id]
            });
            
            console.log(`Added supplier ${supplier.id} to property ${propertyId}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error updating building and property relationships:", error);
    throw error;
  }
}

// עדכון סטטיסטיקות ביצוע של ספק
export async function updateSupplierPerformanceStats(supplier) {
  try {
    // מציאת כל קריאות התחזוקה שטופלו על ידי הספק
    const maintenanceTasks = await Maintenance.list();
    const completedTasks = maintenanceTasks.filter(
      task => task.supplier_id === supplier.id && task.status === 'completed'
    );
    
    if (completedTasks.length === 0) {
      console.log(`No completed maintenance tasks found for supplier ${supplier.id}`);
      return supplier;
    }
    
    // חישוב זמן טיפול ממוצע
    let totalDays = 0;
    let tasksWithDates = 0;
    
    for (const task of completedTasks) {
      if (task.reported_date && task.completed_date) {
        const reportedDate = new Date(task.reported_date);
        const completedDate = new Date(task.completed_date);
        const daysToComplete = Math.round((completedDate - reportedDate) / (1000 * 60 * 60 * 24));
        
        totalDays += daysToComplete;
        tasksWithDates++;
      }
    }
    
    const avgHandlingTime = tasksWithDates > 0 ? Math.round(totalDays / tasksWithDates) : 0;
    
    // חישוב עלות ממוצעת לטיפול
    let totalCost = 0;
    let tasksWithCost = 0;
    
    for (const task of completedTasks) {
      if (task.cost) {
        totalCost += task.cost;
        tasksWithCost++;
      }
    }
    
    const avgCost = tasksWithCost > 0 ? Math.round(totalCost / tasksWithCost) : 0;
    
    // עדכון סטטיסטיקות הספק
    const updatedSupplier = await Supplier.update(supplier.id, {
      ...supplier,
      performance_stats: {
        total_jobs: completedTasks.length,
        avg_handling_time: avgHandlingTime,
        avg_cost: avgCost,
        last_update: new Date().toISOString()
      }
    });
    
    console.log(`Updated performance stats for supplier ${supplier.id}`);
    return updatedSupplier;
  } catch (error) {
    console.error("Error updating supplier performance stats:", error);
    return supplier; // החזרת הספק המקורי במקרה של שגיאה
  }
}

// פונקציה להוספת הערכת ספק
export async function addSupplierReview(supplierId, reviewData) {
  try {
    const supplier = await Supplier.get(supplierId);
    
    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found`);
    }
    
    // הוספת הערכה חדשה למערך ההערכות
    const newReview = {
      date: new Date().toISOString(),
      rating: reviewData.rating,
      comment: reviewData.comment,
      reviewer: reviewData.reviewer || 'anonymous',
      maintenance_id: reviewData.maintenance_id
    };
    
    const reviews = supplier.reviews || [];
    reviews.push(newReview);
    
    // חישוב דירוג ממוצע מעודכן
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = Math.round((totalRating / reviews.length) * 10) / 10; // עיגול לספרה אחת אחרי הנקודה
    
    // עדכון הספק
    const updatedSupplier = await Supplier.update(supplierId, {
      ...supplier,
      reviews: reviews,
      avg_rating: avgRating
    });
    
    console.log(`Added review to supplier ${supplierId}`);
    return updatedSupplier;
  } catch (error) {
    console.error(`Error adding review to supplier ${supplierId}:`, error);
    throw error;
  }
}

// ייצוא פונקציות נוספות
export {
  updateRelatedMaintenanceTasks,
  updateBuildingAndPropertyRelationships
};