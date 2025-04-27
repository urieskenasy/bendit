import { Contract, Payment, Reminder, Document, Property, Tenant } from '@/api/entities';
import { format, addDays, parseISO, differenceInMonths } from 'date-fns';
import { calculateIndexation } from './indexationUtils';

/**
 * מודול לטיפול בעדכונים אוטומטיים של ישויות תלויות בחוזה
 */

// פונקציה ראשית לסנכרון חוזה והישויות התלויות בו
export default async function syncContract(contract, previousContract = null) {
  try {
    console.log("Starting contract sync for:", contract);
    
    // בדיקת אילו שדות עודכנו
    const updatedFields = getUpdatedFields(contract, previousContract);
    
    // אם יש שינויים רלוונטיים, עדכן את הישויות התלויות
    if (Object.keys(updatedFields).length > 0) {
      console.log("Detected changes in fields:", updatedFields);
      
      // 1. עדכון תשלומים
      if (shouldUpdatePayments(updatedFields)) {
        await updateRelatedPayments(contract, updatedFields);
      }
      
      // 2. עדכון תזכורות
      if (shouldUpdateReminders(updatedFields)) {
        await updateRelatedReminders(contract);
      }
      
      // 3. עדכון נכס
      await updatePropertyDetails(contract);
      
      // 4. עדכון דיירים
      await updateTenantsDetails(contract);
    }
    
    console.log("Contract sync completed successfully");
  } catch (error) {
    console.error("Error in contract sync:", error);
    throw error;
  }
}

// בדיקת השדות שהשתנו בחוזה
function getUpdatedFields(newContract, oldContract) {
  if (!oldContract) return {};
  
  const relevantFields = [
    'monthly_rent',
    'start_date',
    'end_date',
    'payment_terms',
    'indexation',
    'status'
  ];
  
  const changes = {};
  
  relevantFields.forEach(field => {
    if (JSON.stringify(newContract[field]) !== JSON.stringify(oldContract[field])) {
      changes[field] = {
        old: oldContract[field],
        new: newContract[field]
      };
    }
  });
  
  return changes;
}

// בדיקה האם יש צורך לעדכן תשלומים
function shouldUpdatePayments(changes) {
  const relevantPaymentFields = ['monthly_rent', 'payment_terms', 'indexation', 'status'];
  return relevantPaymentFields.some(field => field in changes);
}

// בדיקה האם יש צורך לעדכן תזכורות
function shouldUpdateReminders(changes) {
  const relevantReminderFields = ['end_date', 'status'];
  return relevantReminderFields.some(field => field in changes);
}

// עדכון תשלומים קשורים
async function updateRelatedPayments(contract, changes) {
  try {
    console.log("Updating payments for contract:", contract.id);
    
    const payments = await Payment.list();
    const contractPayments = payments.filter(p => p.contract_id === contract.id);
    
    // עדכון כל התשלומים העתידיים
    const today = new Date();
    const futurePayments = contractPayments.filter(payment => 
      new Date(payment.due_date) > today && 
      payment.status === 'pending'
    );
    
    for (const payment of futurePayments) {
      let updatedPayment = { ...payment };
      
      // עדכון סכום התשלום אם שכר הדירה השתנה
      if (changes.monthly_rent) {
        // חישוב הסכום החדש בהתאם לאחוז החלוקה של הדייר
        const tenant = await getTenantShareFromContract(contract, payment.related_to?.id);
        const newAmount = calculateTenantShare(contract.monthly_rent, tenant?.share_percentage);
        updatedPayment.amount = newAmount;
      }
      
      // עדכון תאריך תשלום אם תנאי התשלום השתנו
      if (changes.payment_terms) {
        const newDueDate = calculateNewDueDate(payment.due_date, 
          changes.payment_terms.old?.payment_day,
          changes.payment_terms.new?.payment_day
        );
        updatedPayment.due_date = newDueDate;
      }
      
      // עדכון סכום לפי הצמדה אם רלוונטי
      if (changes.indexation && contract.indexation?.type !== 'none') {
        const indexedAmount = await calculateIndexation(
          updatedPayment.amount,
          contract.indexation
        );
        updatedPayment.amount = indexedAmount;
      }
      
      // ביטול תשלומים אם החוזה בוטל
      if (changes.status && contract.status === 'terminated') {
        updatedPayment.status = 'cancelled';
      }
      
      // שמירת העדכונים
      await Payment.update(payment.id, updatedPayment);
      console.log(`Updated payment ${payment.id}`);
    }
  } catch (error) {
    console.error("Error updating related payments:", error);
    throw error;
  }
}

// עדכון תזכורות קשורות
async function updateRelatedReminders(contract) {
  try {
    console.log("Updating reminders for contract:", contract.id);
    
    const reminders = await Reminder.list();
    const contractReminders = reminders.filter(r => 
      r.related_to?.type === 'contract' && 
      r.related_to?.id === contract.id
    );
    
    // עדכון תזכורות סיום חוזה
    const endDateReminders = contractReminders.filter(r => 
      r.type === 'contract_renewal' && 
      r.status === 'active'
    );
    
    for (const reminder of endDateReminders) {
      // בדיקה האם החוזה עדיין פעיל
      if (contract.status === 'active') {
        // עדכון תאריך התזכורת
        const daysBeforeEnd = reminder.reminder_days_before || 30;
        const reminderDate = addDays(parseISO(contract.end_date), -daysBeforeEnd);
        
        await Reminder.update(reminder.id, {
          ...reminder,
          date: format(reminderDate, 'yyyy-MM-dd'),
          description: `החוזה עתיד להסתיים בתאריך ${contract.end_date}. יש לבדוק אפשרות הארכה או חידוש.`
        });
      } else {
        // ביטול תזכורת אם החוזה לא פעיל
        await Reminder.update(reminder.id, {
          ...reminder,
          status: 'cancelled'
        });
      }
      
      console.log(`Updated reminder ${reminder.id}`);
    }
  } catch (error) {
    console.error("Error updating related reminders:", error);
    throw error;
  }
}

// עדכון פרטי הנכס
async function updatePropertyDetails(contract) {
  try {
    if (!contract.property_id) return;
    
    const property = await Property.get(contract.property_id);
    if (!property) return;
    
    // עדכון סטטוס השכרה ושכר דירה בנכס
    let propertyUpdate = {
      ...property,
      rental_details: {
        ...(property.rental_details || {}),
        status: contract.status === 'active' ? 'rented' : 'available',
        monthly_rent: contract.status === 'active' ? contract.monthly_rent : 0
      }
    };
    
    await Property.update(property.id, propertyUpdate);
    console.log(`Updated property ${property.id} details`);
  } catch (error) {
    console.error("Error updating property details:", error);
    throw error;
  }
}

// עדכון פרטי הדיירים
async function updateTenantsDetails(contract) {
  try {
    if (!contract.tenants || contract.tenants.length === 0) return;
    
    for (const tenantRef of contract.tenants) {
      const tenant = await Tenant.get(tenantRef.tenant_id);
      if (!tenant) continue;
      
      // עדכון פרטי החוזה אצל הדייר
      let tenantUpdate = {
        ...tenant,
        contract_id: contract.id,
        property_id: contract.property_id,
        status: contract.status === 'active' ? 'active' : 'past',
        monthly_rent: calculateTenantShare(contract.monthly_rent, tenantRef.share_percentage),
        contract_start: contract.start_date,
        contract_end: contract.end_date
      };
      
      await Tenant.update(tenant.id, tenantUpdate);
      console.log(`Updated tenant ${tenant.id} details`);
    }
  } catch (error) {
    console.error("Error updating tenants details:", error);
    throw error;
  }
}

// פונקציות עזר

// חישוב חלק הדייר בשכר הדירה
function calculateTenantShare(totalRent, sharePercentage = 100) {
  return Math.round(totalRent * (sharePercentage / 100));
}

// חישוב תאריך תשלום חדש
function calculateNewDueDate(currentDueDate, oldPaymentDay, newPaymentDay) {
  const dueDate = new Date(currentDueDate);
  const currentDay = dueDate.getDate();
  
  if (oldPaymentDay && newPaymentDay && currentDay === oldPaymentDay) {
    dueDate.setDate(newPaymentDay);
  }
  
  return format(dueDate, 'yyyy-MM-dd');
}

// קבלת פרטי הדייר מהחוזה
async function getTenantShareFromContract(contract, tenantId) {
  if (!contract.tenants || !tenantId) return null;
  return contract.tenants.find(t => t.tenant_id === tenantId);
}