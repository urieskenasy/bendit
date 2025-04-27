import { Document, Contract, Payment, Tenant, Maintenance } from '@/api/entities';
import { format, parseISO } from 'date-fns';

/**
 * מודול לניהול וסנכרון של ישות מסמכים
 */

// פונקציה ראשית להוספת מסמך למערכת
export default async function processDocument(document) {
  try {
    console.log("Processing document:", document);
    
    // 1. וידוא תקינות
    validateDocument(document);
    
    // 2. עדכון ישויות קשורות
    await updateRelatedEntities(document);
    
    // 3. יצירת לוג פעילות (בעתיד)
    
    console.log("Document processing completed successfully");
    return true;
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
}

// בדיקת תקינות המסמך
function validateDocument(document) {
  if (!document) throw new Error("No document provided");
  if (!document.type) throw new Error("Document type is required");
  if (!document.date) throw new Error("Document date is required");
  if (!document.file_url) throw new Error("Document file URL is required");
  
  // בדיקת תקינות הקישור לישות (אופציונלי)
  if (document.related_to) {
    if (!document.related_to.type || !document.related_to.id) {
      throw new Error("Invalid entity reference: must include type and id");
    }
  }
}

// עדכון ישויות קשורות למסמך
async function updateRelatedEntities(document) {
  if (!document.related_to) return;
  
  const { type, id } = document.related_to;
  
  switch (type) {
    case 'payment':
      await updatePaymentWithDocument(id, document);
      break;
    case 'contract':
      await updateContractWithDocument(id, document);
      break;
    case 'tenant':
      await updateTenantWithDocument(id, document);
      break;
    case 'maintenance':
      await updateMaintenanceWithDocument(id, document);
      break;
    default:
      console.log(`No specific update needed for ${type} entities`);
  }
}

// עדכון סטטוס תשלום בהתאם למסמך
async function updatePaymentWithDocument(paymentId, document) {
  try {
    const payment = await Payment.get(paymentId);
    if (!payment) {
      console.log(`Payment ${paymentId} not found`);
      return;
    }
    
    // אם המסמך הוא קבלה, עדכן את התשלום ל"שולם"
    if (document.type === 'receipt' && payment.status !== 'paid') {
      await Payment.update(paymentId, {
        ...payment,
        status: 'paid',
        date: document.date // עדכון תאריך התשלום לתאריך הקבלה
      });
      console.log(`Payment ${paymentId} marked as paid based on receipt document`);
    }
    
    // אם המסמך הוא חשבונית, לא יוצר שינוי בסטטוס התשלום
  } catch (error) {
    console.error(`Error updating payment ${paymentId} with document:`, error);
    throw error;
  }
}

// עדכון חוזה בהתאם למסמך
async function updateContractWithDocument(contractId, document) {
  try {
    const contract = await Contract.get(contractId);
    if (!contract) {
      console.log(`Contract ${contractId} not found`);
      return;
    }
    
    // אם המסמך הוא חוזה חתום, עדכן את סטטוס החוזה ל"פעיל"
    if (document.type === 'contract' && document.status === 'final' && contract.status === 'draft') {
      await Contract.update(contractId, {
        ...contract,
        status: 'active',
        signature_date: document.date // עדכון תאריך חתימה
      });
      console.log(`Contract ${contractId} activated based on signed contract document`);
    }
  } catch (error) {
    console.error(`Error updating contract ${contractId} with document:`, error);
    throw error;
  }
}

// עדכון דייר בהתאם למסמך
async function updateTenantWithDocument(tenantId, document) {
  try {
    const tenant = await Tenant.get(tenantId);
    if (!tenant) {
      console.log(`Tenant ${tenantId} not found`);
      return;
    }
    
    // אם זה מסמך זיהוי, עדכן שהדייר עבר אימות
    if (document.type === 'id_document') {
      await Tenant.update(tenantId, {
        ...tenant,
        is_verified: true
      });
      console.log(`Tenant ${tenantId} marked as verified based on ID document`);
    }
  } catch (error) {
    console.error(`Error updating tenant ${tenantId} with document:`, error);
    throw error;
  }
}

// עדכון תחזוקה בהתאם למסמך
async function updateMaintenanceWithDocument(maintenanceId, document) {
  try {
    const maintenance = await Maintenance.get(maintenanceId);
    if (!maintenance) {
      console.log(`Maintenance ${maintenanceId} not found`);
      return;
    }
    
    // אם זה מסמך סיום עבודה, עדכן את סטטוס התחזוקה ל"הושלם"
    if (document.type === 'work_completion' && maintenance.status !== 'completed') {
      await Maintenance.update(maintenanceId, {
        ...maintenance,
        status: 'completed',
        completed_date: document.date
      });
      console.log(`Maintenance ${maintenanceId} marked as completed based on completion document`);
    }
    
    // אם זה חשבונית/קבלה, עדכן את עלות התחזוקה
    if ((document.type === 'invoice' || document.type === 'receipt') && document.amount) {
      await Maintenance.update(maintenanceId, {
        ...maintenance,
        cost: document.amount
      });
      console.log(`Maintenance ${maintenanceId} cost updated to ${document.amount} based on document`);
    }
  } catch (error) {
    console.error(`Error updating maintenance ${maintenanceId} with document:`, error);
    throw error;
  }
}

// יצירת מסמך אוטומטית עבור חוזה
export async function createContractDocument(contract, fileUrl) {
  if (!contract || !fileUrl) {
    throw new Error("Contract and file URL are required");
  }
  
  // יצירת מסמך חוזה
  const contractDocument = {
    type: 'contract',
    number: `CNT-${contract.id}`,
    date: contract.signature_date || format(new Date(), 'yyyy-MM-dd'),
    related_to: {
      type: 'contract',
      id: contract.id
    },
    file_url: fileUrl,
    status: 'final',
    notes: `חוזה שכירות לנכס מ-${contract.start_date} עד ${contract.end_date}`
  };
  
  const savedDocument = await Document.create(contractDocument);
  console.log(`Contract document created with ID: ${savedDocument.id}`);
  
  // עדכון החוזה עם מזהה המסמך
  await Contract.update(contract.id, {
    ...contract,
    document_id: savedDocument.id
  });
  
  return savedDocument;
}

// יצירת מסמך אוטומטית עבור תשלום
export async function createPaymentDocument(payment, documentType, fileUrl) {
  if (!payment || !documentType || !fileUrl) {
    throw new Error("Payment, document type, and file URL are required");
  }
  
  let documentTitle = 'מסמך';
  if (documentType === 'receipt') documentTitle = 'קבלה';
  if (documentType === 'invoice') documentTitle = 'חשבונית';
  
  // יצירת מסמך תשלום
  const paymentDocument = {
    type: documentType,
    number: `${documentType.toUpperCase()}-${payment.id}`,
    date: payment.date || format(new Date(), 'yyyy-MM-dd'),
    related_to: {
      type: 'payment',
      id: payment.id
    },
    amount: payment.amount,
    file_url: fileUrl,
    status: 'final',
    notes: `${documentTitle} עבור תשלום מסוג ${getPaymentTypeText(payment.type)}`
  };
  
  const savedDocument = await Document.create(paymentDocument);
  console.log(`Payment ${documentType} document created with ID: ${savedDocument.id}`);
  
  // עדכון התשלום עם מזהה המסמך
  await Payment.update(payment.id, {
    ...payment,
    document_id: savedDocument.id,
    status: documentType === 'receipt' ? 'paid' : payment.status
  });
  
  return savedDocument;
}

// פונקציות עזר
function getPaymentTypeText(type) {
  const types = {
    'rent': 'שכר דירה',
    'bills': 'חשבונות',
    'deposit': 'פיקדון',
    'maintenance': 'תחזוקה',
    'tax': 'מיסים',
    'committee': 'ועד בית',
    'insurance': 'ביטוח',
    'other': 'אחר'
  };
  return types[type] || type;
}

// ייצוא פונקציות נוספות
export {
  validateDocument,
  updateRelatedEntities,
  updatePaymentWithDocument,
  updateContractWithDocument,
  updateTenantWithDocument,
  updateMaintenanceWithDocument
};