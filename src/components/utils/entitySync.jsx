
/**
 * מודול לסנכרון דו-כיווני בין ישויות
 */

import { Contract, Tenant, Property, Payment, Document, Reminder, Building } from '@/api/entities';
import { 
  logSyncStarted, 
  logSyncCompleted, 
  logSyncFailed,
  logPaymentsGenerated,
  logEntityUpdated,
  logWarning
} from './loggerService';

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for rate-limited entity operations
async function executeWithRateLimit(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.response?.status === 429) {
      await delay(1000);
      return await operation();
    }
    throw error;
  }
}

/**
 * סנכרון ישויות מתוך שינוי בחוזה
 */
export default async function syncAllFromContract(contract) {
  const syncId = Date.now().toString();
  try {
    await logSyncStarted('contract', 'multiple', { 
      contractId: contract.id, 
      syncId
    });
    
    console.log("Starting full sync for contract:", contract);
    
    // Add delays between operations
    await executeWithRateLimit(() => syncPropertyFromContract(contract));
    await delay(200);
    
    await executeWithRateLimit(() => syncTenantsFromContract(contract));
    await delay(200);
    
    if (contract.status === 'active') {
      const payments = await executeWithRateLimit(() => generatePayments(contract));
      if (payments && payments.length > 0) {
        await logPaymentsGenerated(contract.id, payments.length, { syncId });
      }
    }
    await delay(200);
    
    await executeWithRateLimit(() => syncDocumentsFromContract(contract));
    
    console.log("Entity synchronization completed successfully");
    await logSyncCompleted('contract', 'multiple', { contractId: contract.id, syncId });
  } catch (error) {
    console.error("Error in syncAllFromContract:", error);
    await logSyncFailed('contract', 'multiple', error, { contractId: contract.id, syncId });
    throw error;
  }
}

/**
 * סנכרון ישויות מתוך שינוי בבניין
 */
export async function syncAllFromBuilding(building) {
  const syncId = Date.now().toString();
  try {
    await logSyncStarted('building', 'properties', { buildingId: building.id, syncId });
    console.log("Starting sync from building:", building);

    // 1. מצא את כל הנכסים בבניין
    const properties = await Property.list();
    const buildingProperties = properties.filter(p => p.building_id === building.id);

    // 2. עדכן כל נכס
    for (const property of buildingProperties) {
      await Property.update(property.id, {
        ...property,
        building_address: building.address,
        building_details: {
          ...(property.building_details || {}),
          committee: building.building_committee,
          maintenance_fee: building.building_committee?.monthly_fee
        }
      });
      
      await logEntityUpdated('property', property.id, {
        building_address: building.address 
      }, { syncId });
    }

    // 3. עדכן חוזים רלוונטיים
    const contracts = await Contract.list();
    const relatedContracts = contracts.filter(c => 
      buildingProperties.some(p => p.id === c.property_id)
    );

    for (const contract of relatedContracts) {
      await syncAllFromContract(contract);
    }

    console.log(`Synchronized ${buildingProperties.length} properties and ${relatedContracts.length} contracts`);
    await logSyncCompleted('building', 'properties', { 
      buildingId: building.id, 
      propertiesCount: buildingProperties.length,
      contractsCount: relatedContracts.length,
      syncId 
    });
  } catch (error) {
    console.error("Error in syncAllFromBuilding:", error);
    await logSyncFailed('building', 'properties', error, { buildingId: building.id, syncId });
    throw error;
  }
}

/**
 * סנכרון ישויות מתוך שינוי בנכס
 */
export async function syncAllFromProperty(property) {
  const syncId = Date.now().toString();
  try {
    await logSyncStarted('property', 'contracts', { propertyId: property.id, syncId });
    console.log("Starting sync from property:", property);

    // 1. מצא את החוזים הקשורים לנכס
    const contracts = await Contract.list();
    const propertyContracts = contracts.filter(c => c.property_id === property.id);

    // 2. עדכן כל חוזה
    for (const contract of propertyContracts) {
      await syncAllFromContract(contract);
    }

    // 3. עדכן דיירים
    await syncTenantsFromProperty(property);

    console.log(`Synchronized ${propertyContracts.length} contracts`);
    await logSyncCompleted('property', 'contracts', { 
      propertyId: property.id, 
      contractsCount: propertyContracts.length,
      syncId 
    });
  } catch (error) {
    console.error("Error in syncAllFromProperty:", error);
    await logSyncFailed('property', 'contracts', error, { propertyId: property.id, syncId });
    throw error;
  }
}

/**
 * בדיקת עקביות נתונים ותיקון אי-התאמות
 */
export async function validateAndFixEntityRelationships() {
  const syncId = Date.now().toString();
  try {
    await logSyncStarted('system', 'validation', { syncId });
    console.log("Starting data consistency check");

    // 1. בדיקת קשרי בניין-נכס
    const buildings = await Building.list();
    const properties = await Property.list();
    
    for (const property of properties) {
      const building = buildings.find(b => b.id === property.building_id);
      if (!building) {
        await logWarning(`Property ${property.id} references non-existent building`, { 
          propertyId: property.id, 
          buildingId: property.building_id 
        });
        console.warn(`Property ${property.id} references non-existent building`);
        continue;
      }

      // תיקון נתוני בניין בנכס
      if (!property.building_address || 
          JSON.stringify(property.building_address) !== JSON.stringify(building.address)) {
        await Property.update(property.id, {
          ...property,
          building_address: building.address
        });
        await logEntityUpdated('property', property.id, { building_address: building.address }, { syncId });
        console.log(`Updated building address for property ${property.id}`);
      }
    }

    // 2. בדיקת קשרי נכס-חוזה
    const contracts = await Contract.list();
    
    for (const contract of contracts) {
      const property = properties.find(p => p.id === contract.property_id);
      if (!property) {
        await logWarning(`Contract ${contract.id} references non-existent property`, { 
          contractId: contract.id, 
          propertyId: contract.property_id 
        });
        console.warn(`Contract ${contract.id} references non-existent property`);
        continue;
      }

      // בדיקת סטטוס השכרה של הנכס
      if (contract.status === 'active' && property.rental_details?.status !== 'rented') {
        await Property.update(property.id, {
          ...property,
          rental_details: {
            ...(property.rental_details || {}),
            status: 'rented',
            monthly_rent: contract.monthly_rent
          }
        });
        await logEntityUpdated('property', property.id, { 
          rental_details: { status: 'rented', monthly_rent: contract.monthly_rent } 
        }, { syncId });
        console.log(`Updated rental status for property ${property.id}`);
      }
    }

    // 3. בדיקת קשרי חוזה-דייר
    const tenants = await Tenant.list();
    
    for (const contract of contracts) {
      if (!contract.tenants) continue;

      for (const tenantRef of contract.tenants) {
        const tenant = tenants.find(t => t.id === tenantRef.tenant_id);
        if (!tenant) {
          await logWarning(`Contract ${contract.id} references non-existent tenant ${tenantRef.tenant_id}`, { 
            contractId: contract.id, 
            tenantId: tenantRef.tenant_id 
          });
          console.warn(`Contract ${contract.id} references non-existent tenant ${tenantRef.tenant_id}`);
          continue;
        }

        // עדכון פרטי דייר אם צריך
        if (contract.status === 'active' && 
            (tenant.property_id !== contract.property_id || 
             tenant.contract_id !== contract.id)) {
          await Tenant.update(tenant.id, {
            ...tenant,
            property_id: contract.property_id,
            contract_id: contract.id,
            status: 'active'
          });
          await logEntityUpdated('tenant', tenant.id, { 
            property_id: contract.property_id, 
            contract_id: contract.id, 
            status: 'active' 
          }, { syncId });
          console.log(`Updated tenant ${tenant.id} details`);
        }
      }
    }

    console.log("Data consistency check completed");
    await logSyncCompleted('system', 'validation', { syncId });
  } catch (error) {
    console.error("Error in validateAndFixEntityRelationships:", error);
    await logSyncFailed('system', 'validation', error, { syncId });
    throw error;
  }
}

// עדכון הנכס בהתאם לחוזה
async function syncPropertyFromContract(contract) {
  const syncId = Date.now().toString();
  try {
    if (!contract || !contract.property_id) return;
    
    await logSyncStarted('property', 'contract', { 
      contractId: contract.id, 
      propertyId: contract.property_id,
      syncId
    });
    console.log("Syncing property from contract:", contract);
    const property = await Property.get(contract.property_id);
    if (!property) {
      await logWarning(`Property not found`, { propertyId: contract.property_id });
      console.log("Property not found:", contract.property_id);
      return;
    }
    
    // אם החוזה פעיל, סמן את הנכס כמושכר ועדכן את שכר הדירה החודשי
    if (contract.status === 'active') {
      console.log(`Updating property ${property.id} with rent: ${contract.monthly_rent}`);
      const updatedProperty = await Property.update(property.id, {
        ...property,
        rental_details: {
          ...(property.rental_details || {}),
          status: 'rented',
          monthly_rent: parseFloat(contract.monthly_rent) || 0
        }
      });
      await logEntityUpdated('property', property.id, { 
        rental_details: { status: 'rented', monthly_rent: contract.monthly_rent } 
      }, { syncId });
      console.log("Property updated successfully:", updatedProperty);
    } else {
      // בדוק אם יש חוזים אחרים פעילים על הנכס
      const allContracts = await Contract.list();
      const activeContracts = allContracts.filter(c => 
        c.id !== contract.id && 
        c.property_id === property.id && 
        c.status === 'active'
      );
      
      if (activeContracts.length === 0) {
        // אין חוזים אחרים פעילים על הנכס - סמן אותו כפנוי
        console.log(`Marking property ${property.id} as available`);
        await Property.update(property.id, {
          ...property,
          rental_details: {
            ...(property.rental_details || {}),
            status: 'available',
            monthly_rent: 0 // מאפס את שכר הדירה כשהנכס פנוי
          }
        });
        await logEntityUpdated('property', property.id, { 
          rental_details: { status: 'available', monthly_rent: 0 } 
        }, { syncId });
      } else {
        // יש חוזה פעיל אחר - עדכן לפי החוזה האחרון
        const latestContract = activeContracts.sort((a, b) => 
          new Date(b.start_date) - new Date(a.start_date)
        )[0];
        
        console.log(`Updating property ${property.id} with rent from latest contract:`, latestContract.monthly_rent);
        await Property.update(property.id, {
          ...property,
          rental_details: {
            ...(property.rental_details || {}),
            status: 'rented',
            monthly_rent: parseFloat(latestContract.monthly_rent) || 0
          }
        });
        await logEntityUpdated('property', property.id, { 
          rental_details: { status: 'rented', monthly_rent: latestContract.monthly_rent } 
        }, { syncId });
      }
    }
    await logSyncCompleted('property', 'contract', { 
      contractId: contract.id, 
      propertyId: contract.property_id,
      syncId
    });
  } catch (error) {
    console.error("Error syncing property from contract:", error);
    await logSyncFailed('property', 'contract', error, { contractId: contract.id, syncId });
    throw error; // זורק את השגיאה למעלה כדי שנוכל לטפל בה
  }
}

async function generatePayments(contract) {
    if (!contract || !contract.id) return;
    const syncId = Date.now().toString();
    try {
        const startDate = new Date(contract.start_date);
        const endDate = new Date(contract.end_date);
        const monthlyRent = parseFloat(contract.monthly_rent) || 0;
        
        // חישוב תקופת גרייס
        let gracePeriodEndDate = null;
        if (contract.payment_terms?.grace_period) {
            if (contract.payment_terms.grace_period.end_date) {
                gracePeriodEndDate = new Date(contract.payment_terms.grace_period.end_date);
            } else if (contract.payment_terms.grace_period.days > 0) {
                gracePeriodEndDate = new Date(startDate);
                gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + contract.payment_terms.grace_period.days);
            }
        }
        
        // וודא שיש את כל הנתונים הדרושים
        if (!startDate || !endDate || !monthlyRent) {
            await logWarning(`Missing required contract details for payment generation`, { contractId: contract.id });
            console.warn("Missing required contract details for payment generation");
            return;
        }
        
        // חישוב מספר החודשים
        const months = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)) + 1;
        const payments = [];
        
        if (!contract.tenants || !contract.tenants.length) {
            await logWarning(`No tenants found in contract for payment generation`, { contractId: contract.id });
            console.warn("No tenants found in contract");
            return;
        }
        
        for (const tenantRef of contract.tenants) {
            if (!tenantRef.tenant_id) continue;
            
            const tenantShare = tenantRef.share_percentage || 100;
            const tenantRent = Math.round((monthlyRent * tenantShare) / 100);
            
            for (let i = 0; i < months; i++) {
                const paymentDate = new Date(startDate);
                paymentDate.setMonth(paymentDate.getMonth() + i);
                
                const paymentDay = contract.payment_terms?.payment_day || 1;
                paymentDate.setDate(paymentDay);
                
                // בדיקה האם התשלום נופל בתקופת הגרייס
                const isInGracePeriod = contract.payment_terms?.grace_period?.is_rent_free &&
                    gracePeriodEndDate && paymentDate <= gracePeriodEndDate;
                
                // אם זו תקופת גרייס ללא תשלום, דלג על יצירת התשלום
                if (isInGracePeriod) {
                    console.log(`Skipping payment for ${paymentDate.toISOString().split('T')[0]} - in grace period`);
                    continue;
                }
                
                // הכנת סטטוס ועד בית וחשבונות
                const buildingCommitteeStatus = 
                    contract.includes_utilities?.building_committee ? 'included' : 'unpaid';
                
                const billsStatus = {
                    electricity: contract.includes_utilities?.electricity ? 'included' : 'unpaid',
                    water: contract.includes_utilities?.water ? 'included' : 'unpaid',
                    gas: contract.includes_utilities?.gas ? 'included' : 'unpaid',
                    property_tax: contract.includes_utilities?.property_tax ? 'included' : 'unpaid'
                };
                
                payments.push({
                    contract_id: contract.id,
                    property_id: contract.property_id,
                    related_to: {
                        type: 'tenant',
                        id: tenantRef.tenant_id
                    },
                    amount: tenantRent,
                    date: paymentDate.toISOString().split('T')[0],
                    due_date: paymentDate.toISOString().split('T')[0],
                    type: 'rent',
                    status: 'pending',
                    payment_method: contract.payment_terms?.payment_method || 'bank_transfer',
                    payment_number: i + 1,
                    total_payments: months,
                    is_grace_period: false,
                    building_committee_status: buildingCommitteeStatus,
                    bills_status: billsStatus
                });
            }
        }
        
        // יצירת התשלומים במערכת
        for (const payment of payments) {
            await Payment.create(payment);
        }
        
        console.log(`Generated ${payments.length} payments for contract ${contract.id}`);
        await logSyncCompleted('contract', 'payments', { 
            contractId: contract.id, 
            paymentsCount: payments.length,
            syncId
        });
        
        // יצירת תזכורת לסיום תקופת הגרייס
        if (gracePeriodEndDate) {
            await Reminder.create({
                title: `סיום תקופת גרייס - ${contract.property_id}`,
                description: `תקופת הגרייס של ${contract.payment_terms.grace_period.days} ימים מסתיימת`,
                type: 'contract_renewal',
                related_to: {
                    type: 'contract',
                    id: contract.id
                },
                date: gracePeriodEndDate.toISOString().split('T')[0],
                status: 'active',
                priority: 'high'
            });
        }
        
        return payments;
        
    } catch (error) {
        console.error("Error generating payments:", error);
        await logSyncFailed('contract', 'payments', error, { contractId: contract.id, syncId });
        throw new Error(`Failed to generate payments: ${error.message}`);
    }
}

// סנכרון דיירים מנכסים (במקרה של עדכון נכס ישירות)
export async function syncTenantsFromProperty(property) {
  const syncId = Date.now().toString();
  try {
    if (!property || !property.id) return;
    
    await logSyncStarted('tenant', 'property', { propertyId: property.id, syncId });
    console.log("Syncing tenants from property:", property);
    
    // מצא את כל הדיירים המקושרים לנכס זה
    const allTenants = await Tenant.list();
    const propertyTenants = allTenants.filter(t => t.property_id === property.id);
    
    for (const tenant of propertyTenants) {
      // בדוק אם הנכס מושכר או פנוי
      if (property.rental_details?.status === 'available') {
        // הנכס פנוי, אז בדוק אם יש צורך לעדכן את סטטוס הדייר
        if (tenant.status === 'active') {
          // חפש חוזים אחרים פעילים של הדייר
          const allContracts = await Contract.list();
          const activeTenantContracts = allContracts.filter(c => 
            c.status === 'active' && 
            c.tenants && 
            c.tenants.some(t => t.tenant_id === tenant.id) &&
            c.property_id !== property.id
          );
          
          if (activeTenantContracts.length === 0) {
            // אם אין חוזים אחרים פעילים, עדכן את סטטוס הדייר ל'past'
            await Tenant.update(tenant.id, {
              ...tenant,
              status: 'past',
              property_id: null
            });
            await logEntityUpdated('tenant', tenant.id, { status: 'past', property_id: null }, { syncId });
            console.log(`Tenant ${tenant.id} status changed to past (no active contracts)`);
          }
        }
      }
    }
    await logSyncCompleted('tenant', 'property', { propertyId: property.id, syncId });
  } catch (error) {
    console.error("Error syncing tenants from property:", error);
    await logSyncFailed('tenant', 'property', error, { propertyId: property.id, syncId });
  }
}

// עדכון הדיירים בהתאם לחוזה
async function syncTenantsFromContract(contract) {
  const syncId = Date.now().toString();
  try {
    if (!contract || !contract.tenants) return;
    
    await logSyncStarted('tenant', 'contract', { contractId: contract.id, syncId });

    // עבור על כל הדיירים בחוזה
    for (const tenantRef of contract.tenants) {
      if (!tenantRef.tenant_id) continue;
      
      const tenant = await Tenant.get(tenantRef.tenant_id);
      if (!tenant) continue;
      
      const tenantRent = Math.round(contract.monthly_rent * (tenantRef.share_percentage || 100) / 100);
      
      // עדכן את נתוני הדייר לפי החוזה הנוכחי
      if (contract.status === 'active') {
        await Tenant.update(tenant.id, {
          property_id: contract.property_id,
          status: 'active',
          contract_id: contract.id,
          contract_start: contract.start_date,
          contract_end: contract.end_date,
          monthly_rent: tenantRent,
          share_percentage: tenantRef.share_percentage || 100
        });
        await logEntityUpdated('tenant', tenant.id, { 
          property_id: contract.property_id,
          status: 'active',
          contract_id: contract.id,
          monthly_rent: tenantRent,
          share_percentage: tenantRef.share_percentage || 100
        }, { syncId });
        console.log(`Tenant ${tenant.id} updated as active with contract ${contract.id}`);
      } else {
        // חוזה לא פעיל - בדוק אם יש חוזים אחרים פעילים של הדייר
        const allContracts = await Contract.list();
        const activeTenantContracts = allContracts.filter(c => 
          c.id !== contract.id && 
          c.status === 'active' && 
          c.tenants && 
          c.tenants.some(t => t.tenant_id === tenant.id)
        );
        
        if (activeTenantContracts.length === 0) {
          // אין חוזים אחרים פעילים, עדכן את סטטוס הדייר ל'past'
          await Tenant.update(tenant.id, {
            ...tenant,
            status: 'past',
            property_id: null
          });
          await logEntityUpdated('tenant', tenant.id, { status: 'past', property_id: null }, { syncId });
          console.log(`Tenant ${tenant.id} status changed to past (no active contracts)`);
        }
      }
    }
    await logSyncCompleted('tenant', 'contract', { contractId: contract.id, syncId });
  } catch (error) {
    console.error("Error syncing tenants from contract:", error);
    await logSyncFailed('tenant', 'contract', error, { contractId: contract.id, syncId });
  }
}

// עדכון תשלומים בהתאם לחוזה
async function syncPaymentsFromContract(contract) {
  const syncId = Date.now().toString();
  try {
    if (!contract || !contract.id) return;
    
    await logSyncStarted('payment', 'contract', { contractId: contract.id, syncId });

    const allPayments = await Payment.list();
    const contractPayments = allPayments.filter(p => p.contract_id === contract.id);
    
    // עדכן את כל התשלומים הקשורים לחוזה זה שעדיין לא שולמו
    for (const payment of contractPayments) {
      if (payment.status === 'paid') continue; // אל תעדכן תשלומים ששולמו כבר
      
      // חפש את הדייר הקשור לתשלום זה
      const relatedTenant = contract.tenants?.find(t => 
        payment.related_to?.type === 'tenant' && 
        payment.related_to?.id === t.tenant_id
      );
      
      if (relatedTenant) {
        // חשב את חלקו של הדייר בשכר הדירה
        const tenantRent = Math.round(contract.monthly_rent * (relatedTenant.share_percentage || 100) / 100);
        
        // עדכן את התשלום
        await Payment.update(payment.id, {
          amount: tenantRent,
          property_id: contract.property_id,
          status: contract.status === 'active' ? payment.status : 'cancelled' // בטל תשלומים עתידיים אם החוזה לא פעיל
        });
        await logEntityUpdated('payment', payment.id, { 
          amount: tenantRent,
          property_id: contract.property_id,
          status: contract.status === 'active' ? payment.status : 'cancelled'
        }, { syncId });
        console.log(`Payment ${payment.id} updated with amount ${tenantRent}`);
      }
    }
    await logSyncCompleted('payment', 'contract', { contractId: contract.id, syncId });
  } catch (error) {
    console.error("Error syncing payments from contract:", error);
    await logSyncFailed('payment', 'contract', error, { contractId: contract.id, syncId });
  }
}

// עדכון מסמכים בהתאם לחוזה
async function syncDocumentsFromContract(contract) {
  const syncId = Date.now().toString();
  try {
    if (!contract || !contract.id) return;
    
    await logSyncStarted('document', 'contract', { contractId: contract.id, syncId });

    const allDocuments = await Document.list();
    const contractDocuments = allDocuments.filter(d => 
      d.related_to?.type === 'contract' && 
      d.related_to?.id === contract.id
    );
    
    for (const document of contractDocuments) {
      if (document.status === 'draft') {
        await Document.update(document.id, {
          ...document,
          property_id: contract.property_id // קשר בין מסמך לנכס
        });
        await logEntityUpdated('document', document.id, { property_id: contract.property_id }, { syncId });
      }
    }
    await logSyncCompleted('document', 'contract', { contractId: contract.id, syncId });
  } catch (error) {
    console.error("Error syncing documents from contract:", error);
    await logSyncFailed('document', 'contract', error, { contractId: contract.id, syncId });
  }
}

// יצירת תזכורות מערכת עבור סיום חוזה
async function createContractExpirationReminder(contract) {
  const syncId = Date.now().toString();
  try {
    if (!contract || !contract.id || contract.status !== 'active') return;
    
    await logSyncStarted('reminder', 'contract', { contractId: contract.id, syncId });

    // בדוק אם כבר קיימת תזכורת לסיום חוזה זה
    const allReminders = await Reminder.list();
    const existingReminder = allReminders.find(r => 
      r.related_to?.type === 'contract' && 
      r.related_to?.id === contract.id && 
      r.type === 'contract_renewal'
    );
    
    if (existingReminder) {
      // עדכן את התזכורת הקיימת
      await Reminder.update(existingReminder.id, {
        ...existingReminder,
        date: contract.end_date, // עדכן את תאריך התזכורת לסיום החוזה החדש
        description: `החוזה עתיד להסתיים בתאריך ${contract.end_date}. יש לבדוק אפשרות הארכה או חידוש.`
      });
      await logEntityUpdated('reminder', existingReminder.id, { date: contract.end_date }, { syncId });
      console.log(`Contract expiration reminder ${existingReminder.id} updated`);
    } else {
      // יצירת תזכורת חדשה לסיום החוזה
      const newReminder = {
        title: `סיום חוזה שכירות - ${getContractTitle(contract)}`,
        description: `החוזה עתיד להסתיים בתאריך ${contract.end_date}. יש לבדוק אפשרות הארכה או חידוש.`,
        type: 'contract_renewal',
        related_to: {
          type: 'contract',
          id: contract.id
        },
        date: contract.end_date,
        reminder_days_before: 30, // תזכורת 30 יום לפני סיום החוזה
        status: 'active',
        priority: 'high'
      };
      
      const createdReminder = await Reminder.create(newReminder);
      await logEntityUpdated('reminder', createdReminder.id, newReminder, { syncId });
      console.log(`New contract expiration reminder created: ${createdReminder.id}`);
    }
    await logSyncCompleted('reminder', 'contract', { contractId: contract.id, syncId });
  } catch (error) {
    console.error("Error creating contract expiration reminder:", error);
    await logSyncFailed('reminder', 'contract', error, { contractId: contract.id, syncId });
  }
}

// פונקציות עזר

function getContractTitle(contract) {
  // נסה למצוא כותרת משמעותית לחוזה (לתזכורות, התראות וכד')
  return contract.contract_number || `חוזה ${contract.id}`;
}
