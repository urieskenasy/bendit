/**
 * מודל קשרי הישויות של מערכת NechesNet
 * מגדיר את ההיררכיה, הקשרים והירושה בין הישויות השונות
 */

export const entityRelationships = {
  // בניין מוריש מידע לנכסים
  building: {
    inheritsTo: ['property'],
    attributes: [
      'address', // כתובת מלאה
      'building_type', // סוג בניין
      'building_committee', // פרטי ועד בית
      'amenities', // מתקנים בבניין
      'details.total_floors', // מספר קומות
      'details.year_built', // שנת בנייה
    ],
    relatedTo: ['property', 'supplier', 'maintenance'],
  },
  
  // נכס מקבל מידע מבניין ומוריש לחוזים
  property: {
    inheritsFrom: ['building'],
    inheritsTo: ['contract'],
    attributes: [
      'property_number', // מזהה הנכס
      'type', // סוג הנכס
      'measurements', // מידות ומאפיינים
      'features', // מאפיינים
      'owners', // בעלי הנכס ואחוזי בעלות
      'rental_details', // פרטי השכרה ברירת מחדל
      'vat_settings', // הגדרות מע"מ ברירת מחדל
    ],
    relatedTo: ['building', 'contract', 'supplier', 'owner', 'maintenance'],
  },
  
  // חוזה מקבל מידע מנכס ומוריש לדייר, תשלומים וערבויות
  contract: {
    inheritsFrom: ['property'],
    inheritsTo: ['tenant', 'payment', 'guarantee'],
    attributes: [
      'start_date', // תאריך תחילת חוזה
      'end_date', // תאריך סיום חוזה
      'signature_date', // תאריך חתימה
      'monthly_rent', // שכר דירה חודשי
      'payment_day', // יום תשלום בחודש
      'deposit_amount', // דמי ביטחון
      'indexation_type', // סוג הצמדה (מדד/דולר)
      'includes_maintenance', // כולל דמי ניהול
      'includes_property_tax', // כולל ארנונה
      'includes_water', // כולל מים
      'vat_settings', // הגדרות מע"מ ספציפיות לחוזה
    ],
    relatedTo: ['property', 'tenant', 'payment', 'guarantee', 'document'],
  },
  
  // דייר מקבל מידע מחוזה ומוריש לתשלומים ומסמכים
  tenant: {
    inheritsFrom: ['contract'],
    inheritsTo: ['payment', 'document'],
    attributes: [
      'full_name', // שם מלא
      'id_number', // מספר זהות
      'tenant_type', // סוג דייר (פרטי/מסחרי)
      'phone', // טלפון
      'email', // דוא"ל
      'payment_method', // אמצעי תשלום מועדף
      'utility_readings', // קריאות מונים
      'bills_transferred', // סטטוס העברת חשבונות
    ],
    relatedTo: ['contract', 'payment', 'document', 'reminder'],
  },
  
  // תשלום מקבל מידע מחוזה ודייר ומוריש למסמכים
  payment: {
    inheritsFrom: ['contract', 'tenant'],
    inheritsTo: ['document'],
    attributes: [
      'date', // תאריך תשלום
      'due_date', // תאריך לתשלום
      'amount', // סכום
      'type', // סוג תשלום (שכ"ד, ועד בית וכו')
      'status', // סטטוס תשלום
      'payment_method', // אמצעי תשלום
    ],
    relatedTo: ['contract', 'tenant', 'document', 'reminder', 'owner'],
  },
  
  // מסמך מקבל מידע מחוזה, דייר, תשלום ותחזוקה
  document: {
    inheritsFrom: ['contract', 'tenant', 'payment', 'maintenance'],
    attributes: [
      'type', // סוג מסמך
      'number', // מספר מסמך
      'date', // תאריך
      'file_url', // קישור לקובץ
    ],
    relatedTo: ['contract', 'tenant', 'payment', 'maintenance'],
  },
  
  // תחזוקה מקבלת מידע מנכס, בניין וספקים ומורישה למסמכים ותזכורות
  maintenance: {
    inheritsFrom: ['property', 'building', 'supplier'],
    inheritsTo: ['document', 'reminder'],
    attributes: [
      'title', // כותרת המשימה או בקשת התחזוקה
      'description', // תיאור מפורט
      'type', // סוג המשימה
      'priority', // רמת דחיפות
      'status', // סטטוס המשימה
      'supplier_id', // מזהה הספק המטפל
      'cost', // עלות הטיפול
    ],
    relatedTo: ['property', 'building', 'supplier', 'document', 'reminder'],
  },
  
  // ספק מקבל מידע מבניין ונכס ומוריש לתחזוקה
  supplier: {
    relatedTo: ['building', 'property', 'maintenance'],
    attributes: [
      'name', // שם הספק
      'service_type', // תחום פעילות
      'phone', // טלפון
      'email', // דוא"ל
    ],
  },
  
  // בעל נכס מקבל מידע מנכס ומוריש לדוחות
  owner: {
    relatedTo: ['property'],
    attributes: [
      'full_name', // שם מלא
      'id_number', // מספר זהות
      'phone', // טלפון
      'email', // דוא"ל
      'bank_account', // פרטי חשבון בנק
    ],
  },
  
  // תזכורת מקבלת מידע מחוזה, דייר, תשלום ותחזוקה
  reminder: {
    inheritsFrom: ['contract', 'tenant', 'payment', 'maintenance'],
    attributes: [
      'title', // כותרת התזכורת
      'description', // תיאור מפורט
      'type', // סוג התזכורת
      'date', // תאריך התזכורת
      'is_recurring', // האם חוזר על עצמו
      'recurrence_pattern', // תבנית חזרה
      'sync_with_calendar', // האם לסנכרן עם גוגל קלנדר
    ],
    relatedTo: ['contract', 'tenant', 'payment', 'maintenance'],
  },
  
  // דוח מקבל מידע מכל הישויות בהתאם לסוג הדוח
  report: {
    inheritsFrom: [
      'building', 'property', 'contract', 'tenant', 
      'payment', 'maintenance', 'owner'
    ],
    attributes: [], // הדוחות הם ישות מיוחדת שרק שואבת מידע, לא מאחסנת אותו
    relatedTo: [
      'building', 'property', 'contract', 'tenant', 
      'payment', 'maintenance', 'owner'
    ],
  },
  
  // ערבות מקבלת מידע מחוזה
  guarantee: {
    inheritsFrom: ['contract'],
    attributes: [
      'type', // סוג הערבות
      'amount', // סכום הערבות
      'expiry_date', // תאריך פקיעה
      'status', // סטטוס הערבות
    ],
    relatedTo: ['contract', 'reminder'],
  },
};

/**
 * פונקציה להוספת קשרים חדשים למערכת
 */
export function addEntityRelationship(sourceEntity, targetEntity, relationshipType, attributes = []) {
  if (!entityRelationships[sourceEntity]) {
    entityRelationships[sourceEntity] = {
      relatedTo: [],
      attributes: []
    };
  }
  
  if (relationshipType === 'inheritsTo') {
    if (!entityRelationships[sourceEntity].inheritsTo) {
      entityRelationships[sourceEntity].inheritsTo = [];
    }
    if (!entityRelationships[sourceEntity].inheritsTo.includes(targetEntity)) {
      entityRelationships[sourceEntity].inheritsTo.push(targetEntity);
    }
  }
  
  if (relationshipType === 'inheritsFrom') {
    if (!entityRelationships[sourceEntity].inheritsFrom) {
      entityRelationships[sourceEntity].inheritsFrom = [];
    }
    if (!entityRelationships[sourceEntity].inheritsFrom.includes(targetEntity)) {
      entityRelationships[sourceEntity].inheritsFrom.push(targetEntity);
    }
  }
  
  if (relationshipType === 'relatedTo') {
    if (!entityRelationships[sourceEntity].relatedTo.includes(targetEntity)) {
      entityRelationships[sourceEntity].relatedTo.push(targetEntity);
    }
  }
  
  if (attributes.length > 0) {
    entityRelationships[sourceEntity].attributes.push(...attributes);
  }
}

/**
 * פונקציה למיפוי שדות שיש לקחת מישות אב
 */
export function getInheritedAttributes(entityType) {
  const entity = entityRelationships[entityType];
  if (!entity || !entity.inheritsFrom) return [];
  
  let inheritedAttributes = [];
  entity.inheritsFrom.forEach(parentType => {
    const parentEntity = entityRelationships[parentType];
    if (parentEntity && parentEntity.attributes) {
      inheritedAttributes.push(...parentEntity.attributes);
    }
    
    // רקורסיבית לאסוף גם מהאבות של האב
    inheritedAttributes.push(...getInheritedAttributes(parentType));
  });
  
  return [...new Set(inheritedAttributes)]; // הסר כפילויות
}

/**
 * פונקציה לבדיקה אם שתי ישויות קשורות
 */
export function areEntitiesRelated(sourceEntity, targetEntity) {
  const source = entityRelationships[sourceEntity];
  
  if (!source) return false;
  
  // בדיקת קשר ישיר
  if (source.relatedTo && source.relatedTo.includes(targetEntity)) {
    return true;
  }
  
  // בדיקת קשר ירושה
  if (source.inheritsFrom && source.inheritsFrom.includes(targetEntity)) {
    return true;
  }
  
  if (source.inheritsTo && source.inheritsTo.includes(targetEntity)) {
    return true;
  }
  
  return false;
}