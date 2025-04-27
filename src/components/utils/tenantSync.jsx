import { Tenant, Contract, Payment, Document, Reminder } from '@/api/entities';
import { format, addDays } from 'date-fns';

/**
 * מודול לסנכרון וטיפול בקשרים של ישות דייר
 */

// סנכרון דייר מול חוזה
async function syncTenantWithContract(tenant) {
  try {
    // מצא את החוזה הפעיל של הדייר
    const contracts = await Contract.list();
    const activeContract = contracts.find(c => 
      c.status === 'active' && 
      c.tenants?.some(t => t.tenant_id === tenant.id)
    );
    
    if (activeContract) {
      // מצא את חלקו של הדייר בחוזה
      const tenantContractRef = activeContract.tenants.find(t => t.tenant_id === tenant.id);
      const tenantShare = tenantContractRef?.share_percentage || 100;
      const monthlyRent = Math.round((activeContract.monthly_rent * tenantShare) / 100);
      
      // עדכן את פרטי הדייר בהתאם לחוזה
      await Tenant.update(tenant.id, {
        ...tenant,
        status: 'active',
        property_id: activeContract.property_id,
        contract_id: activeContract.id,
        contract_start: activeContract.start_date,
        contract_end: activeContract.end_date,
        monthly_rent: monthlyRent,
        share_percentage: tenantShare
      });
    } else {
      // אם אין חוזה פעיל, עדכן סטטוס בהתאם
      if (tenant.status === 'active') {
        await Tenant.update(tenant.id, {
          ...tenant,
          status: 'past',
          property_id: null,
          contract_id: null
        });
      }
    }
  } catch (error) {
    console.error("Error syncing tenant with contract:", error);
    throw error;
  }
}

// סנכרון תשלומים של דייר
async function syncTenantPayments(tenant) {
  try {
    if (tenant.status !== 'active' || !tenant.contract_id) return;
    
    const payments = await Payment.list();
    const tenantPayments = payments.filter(p => 
      p.related_to?.type === 'tenant' && 
      p.related_to?.id === tenant.id
    );
    
    // בדוק תשלומים חסרים ויצור אותם במידת הצורך
    if (tenant.monthly_rent) {
      const contract = await Contract.get(tenant.contract_id);
      if (!contract) return;
      
      // חישוב תאריכי תשלום
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const paymentDate = format(currentDate, 'yyyy-MM-dd');
        const existingPayment = tenantPayments.find(p => 
          p.type === 'rent' && 
          format(new Date(p.due_date), 'yyyy-MM') === format(currentDate, 'yyyy-MM')
        );
        
        if (!existingPayment) {
          // יצירת תשלום חדש
          await Payment.create({
            related_to: {
              type: 'tenant',
              id: tenant.id
            },
            contract_id: tenant.contract_id,
            property_id: tenant.property_id,
            date: paymentDate,
            due_date: paymentDate,
            amount: tenant.monthly_rent,
            type: 'rent',
            status: 'pending'
          });
        }
        
        currentDate = addDays(currentDate, 30); // קידום לחודש הבא בקירוב
      }
    }
  } catch (error) {
    console.error("Error syncing tenant payments:", error);
    throw error;
  }
}

// יצירת תזכורות רלוונטיות לדייר
async function createTenantReminders(tenant) {
  try {
    if (tenant.status !== 'active' || !tenant.contract_end) return;
    
    const existingReminders = await Reminder.list();
    const contractEndReminder = existingReminders.find(r => 
      r.related_to?.type === 'tenant' && 
      r.related_to?.id === tenant.id &&
      r.type === 'contract_renewal'
    );
    
    // תזכורת לחידוש חוזה אם לא קיימת
    if (!contractEndReminder) {
      const reminderDate = addDays(new Date(tenant.contract_end), -60); // חודשיים לפני
      
      await Reminder.create({
        title: `חידוש חוזה - ${tenant.full_name}`,
        description: `יש לבדוק אפשרות חידוש חוזה עבור הדייר ${tenant.full_name}`,
        type: 'contract_renewal',
        related_to: {
          type: 'tenant',
          id: tenant.id
        },
        date: format(reminderDate, 'yyyy-MM-dd'),
        status: 'active',
        priority: 'high'
      });
    }
    
    // תזכורת לבדיקת קריאות מונים אם לא קיימת
    const meterCheckReminder = existingReminders.find(r => 
      r.related_to?.type === 'tenant' && 
      r.related_to?.id === tenant.id &&
      r.type === 'meter_reading'
    );
    
    if (!meterCheckReminder) {
      await Reminder.create({
        title: `בדיקת מונים - ${tenant.full_name}`,
        description: `יש לבצע קריאת מונים תקופתית`,
        type: 'meter_reading',
        related_to: {
          type: 'tenant',
          id: tenant.id
        },
        date: format(addDays(new Date(), 30), 'yyyy-MM-dd'), // חודש מהיום
        is_recurring: true,
        recurrence_pattern: 'monthly',
        status: 'active',
        priority: 'medium'
      });
    }
  } catch (error) {
    console.error("Error creating tenant reminders:", error);
    throw error;
  }
}

// בדיקת תשלומים ועדכון סטטוס חשבונות
async function checkTenantPaymentStatus(tenant) {
  try {
    const payments = await Payment.list();
    const tenantPayments = payments.filter(p => 
      p.related_to?.type === 'tenant' && 
      p.related_to?.id === tenant.id
    );
    
    const hasLatePayments = tenantPayments.some(p => p.status === 'late');
    const hasPendingPayments = tenantPayments.some(p => p.status === 'pending');
    
    let billsStatus = 'up_to_date';
    if (hasLatePayments) {
      billsStatus = 'late';
    } else if (hasPendingPayments) {
      billsStatus = 'pending';
    }
    
    // עדכון סטטוס החשבונות של הדייר
    await Tenant.update(tenant.id, {
      ...tenant,
      bills_status: billsStatus
    });
    
    return billsStatus;
  } catch (error) {
    console.error("Error checking tenant payment status:", error);
    throw error;
  }
}

// פונקציה ראשית לסנכרון דייר - default export
export default async function syncTenant(tenant) {
  try {
    console.log("Starting tenant sync for:", tenant);
    
    // 1. סנכרון מול חוזה פעיל
    await syncTenantWithContract(tenant);
    
    // 2. יצירת/עדכון תשלומים
    await syncTenantPayments(tenant);
    
    // 3. יצירת תזכורות רלוונטיות
    await createTenantReminders(tenant);
    
    // 4. בדיקת סטטוס תשלומים
    await checkTenantPaymentStatus(tenant);
    
    console.log("Tenant sync completed successfully");
  } catch (error) {
    console.error("Error in tenant sync:", error);
    throw error;
  }
}

// ייצוא נוסף של פונקציות שימושיות
export {
  syncTenantWithContract,
  syncTenantPayments,
  createTenantReminders,
  checkTenantPaymentStatus
};