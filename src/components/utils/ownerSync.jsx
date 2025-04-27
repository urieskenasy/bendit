import { Owner, Property, Tenant, Payment, Contract } from '@/api/entities';
import { format } from 'date-fns';

/**
 * מודול לסנכרון וטיפול בקשרים של ישות בעל נכס
 */

// פונקציה ראשית לסנכרון בעל נכס
export default async function syncOwner(owner) {
  try {
    console.log("Starting owner sync for:", owner);
    
    // 1. עדכון הנכסים השייכים לבעל הנכס
    await updateOwnerProperties(owner);
    
    // 2. עדכון נתוני דיירים הקשורים לנכסים של בעל הנכס
    await updateRelatedTenants(owner);
    
    // 3. עדכון חלוקת הכנסות
    await updateIncomeDistribution(owner);
    
    console.log("Owner sync completed successfully");
  } catch (error) {
    console.error("Error in owner sync:", error);
    throw error;
  }
}

// עדכון נכסים השייכים לבעל הנכס
async function updateOwnerProperties(owner) {
  try {
    // מציאת כל הנכסים בהם בעל הנכס מופיע
    const properties = await Property.list();
    const ownerProperties = properties.filter(property => 
      property.owners && 
      property.owners.some(o => o.owner_id === owner.id)
    );
    
    if (ownerProperties.length === 0) {
      console.log(`No properties found for owner ${owner.id}`);
      return;
    }
    
    console.log(`Found ${ownerProperties.length} properties for owner ${owner.id}`);
    
    // עדכון פרטי בעל הנכס בכל אחד מהנכסים
    for (const property of ownerProperties) {
      const updatedOwners = property.owners.map(o => {
        if (o.owner_id === owner.id) {
          // עדכון פרטי בעל הנכס
          return {
            ...o,
            owner_name: owner.full_name, // שמירת שם בעל הנכס לנוחות
            owner_details: {
              full_name: owner.full_name,
              phone: owner.phone,
              email: owner.email,
              bank_account: owner.bank_account
            }
          };
        }
        return o;
      });
      
      // עדכון הנכס
      await Property.update(property.id, {
        ...property,
        owners: updatedOwners
      });
      
      console.log(`Updated owner details in property ${property.id}`);
    }
  } catch (error) {
    console.error("Error updating owner properties:", error);
    throw error;
  }
}

// עדכון דיירים הקשורים לנכסי בעל הנכס
async function updateRelatedTenants(owner) {
  try {
    // מציאת הנכסים של בעל הנכס
    const properties = await Property.list();
    const ownerProperties = properties.filter(property => 
      property.owners && 
      property.owners.some(o => o.owner_id === owner.id)
    );
    
    if (ownerProperties.length === 0) return;
    
    // מציאת הדיירים הפעילים בנכסים אלו
    const tenants = await Tenant.list();
    const relatedTenants = tenants.filter(tenant => 
      tenant.status === 'active' && 
      ownerProperties.some(p => p.id === tenant.property_id)
    );
    
    if (relatedTenants.length === 0) {
      console.log(`No active tenants found in owner's properties`);
      return;
    }
    
    console.log(`Found ${relatedTenants.length} tenants related to owner ${owner.id}`);
    
    // עדכון פרטי בעל הנכס אצל הדיירים
    for (const tenant of relatedTenants) {
      const property = ownerProperties.find(p => p.id === tenant.property_id);
      
      if (property) {
        const ownerInfo = property.owners.find(o => o.owner_id === owner.id);
        const ownerPercentage = ownerInfo ? ownerInfo.percentage : 100;
        
        const propertyOwners = property.owners.map(o => ({
          id: o.owner_id,
          full_name: o.owner_details?.full_name || owner.full_name,
          percentage: o.percentage,
          is_primary: o.owner_id === owner.id // בעל הנכס הנוכחי מסומן כראשי
        }));
        
        // עדכון הדייר
        await Tenant.update(tenant.id, {
          ...tenant,
          property_owners: propertyOwners
        });
        
        console.log(`Updated owner info for tenant ${tenant.id}`);
      }
    }
  } catch (error) {
    console.error("Error updating related tenants:", error);
    throw error;
  }
}

// עדכון חלוקת הכנסות לפי אחוזי בעלות
async function updateIncomeDistribution(owner) {
  try {
    // מציאת הנכסים של בעל הנכס
    const properties = await Property.list();
    const ownerProperties = properties.filter(property => 
      property.owners && 
      property.owners.some(o => o.owner_id === owner.id)
    );
    
    if (ownerProperties.length === 0) return;
    
    // מציאת החוזים הפעילים בנכסים אלו
    const contracts = await Contract.list();
    const activeContracts = contracts.filter(contract => 
      contract.status === 'active' && 
      ownerProperties.some(p => p.id === contract.property_id)
    );
    
    if (activeContracts.length === 0) {
      console.log(`No active contracts found for owner's properties`);
      return;
    }
    
    // מציאת התשלומים הקשורים לחוזים אלו
    const payments = await Payment.list();
    const contractPayments = payments.filter(payment => 
      activeContracts.some(c => c.id === payment.contract_id)
    );
    
    // חישוב הכנסות לכל נכס
    for (const property of ownerProperties) {
      // מציאת כל החוזים הפעילים עבור נכס זה
      const propertyContracts = activeContracts.filter(c => c.property_id === property.id);
      
      if (propertyContracts.length === 0) continue;
      
      // מציאת התשלומים עבור חוזים אלו
      const propertyPayments = contractPayments.filter(payment => 
        propertyContracts.some(c => c.id === payment.contract_id)
      );
      
      if (propertyPayments.length === 0) continue;
      
      // מציאת אחוז הבעלות של בעל הנכס בנכס זה
      const ownerInfo = property.owners.find(o => o.owner_id === owner.id);
      const ownerPercentage = ownerInfo ? ownerInfo.percentage : 0;
      
      if (ownerPercentage === 0) continue;
      
      // חישוב הכנסה כוללת וחלק היחסי של בעל הנכס
      let totalIncome = 0;
      let ownerIncome = 0;
      
      for (const payment of propertyPayments) {
        if (payment.status === 'paid' && payment.type === 'rent') {
          totalIncome += payment.amount;
          ownerIncome += (payment.amount * ownerPercentage) / 100;
        }
      }
      
      console.log(`Calculated income for property ${property.id}: Total=${totalIncome}, Owner's part=${ownerIncome}`);
      
      // עדכון מידע הכנסות בנכס
      const incomeDetails = property.income_distribution || {};
      const ownerIncomeData = incomeDetails[owner.id] || {};
      
      incomeDetails[owner.id] = {
        ...ownerIncomeData,
        owner_id: owner.id,
        owner_name: owner.full_name,
        percentage: ownerPercentage,
        total_income: totalIncome,
        owner_income: ownerIncome,
        last_update: new Date().toISOString()
      };
      
      await Property.update(property.id, {
        ...property,
        income_distribution: incomeDetails
      });
      
      console.log(`Updated income distribution for property ${property.id}`);
    }
  } catch (error) {
    console.error("Error updating income distribution:", error);
    throw error;
  }
}

// חישוב הכנסות כוללות לבעל נכס
export async function calculateOwnerTotalIncome(ownerId) {
  try {
    const owner = await Owner.get(ownerId);
    if (!owner) {
      throw new Error(`Owner ${ownerId} not found`);
    }
    
    // מציאת כל הנכסים של בעל הנכס
    const properties = await Property.list();
    const ownerProperties = properties.filter(property => 
      property.owners && 
      property.owners.some(o => o.owner_id === ownerId)
    );
    
    if (ownerProperties.length === 0) {
      return {
        totalIncome: 0,
        activeProperties: 0,
        rentedProperties: 0,
        totalPercentage: 0
      };
    }
    
    let totalIncome = 0;
    let activeProperties = 0;
    let rentedProperties = 0;
    let totalPercentage = 0;
    
    // חישוב הכנסות והכנת נתונים סטטיסטיים
    for (const property of ownerProperties) {
      // מציאת אחוז הבעלות
      const ownerInfo = property.owners.find(o => o.owner_id === ownerId);
      const ownerPercentage = ownerInfo ? ownerInfo.percentage : 0;
      
      totalPercentage += ownerPercentage;
      activeProperties++;
      
      // בדיקה אם הנכס מושכר
      if (property.rental_details?.status === 'rented') {
        rentedProperties++;
        
        // חישוב ההכנסה החודשית
        const monthlyRent = property.rental_details.monthly_rent || 0;
        const ownerMonthlyIncome = (monthlyRent * ownerPercentage) / 100;
        
        totalIncome += ownerMonthlyIncome;
      }
    }
    
    // עדכון נתוני ההכנסה אצל בעל הנכס
    const updatedOwner = await Owner.update(ownerId, {
      ...owner,
      income_stats: {
        monthly_income: totalIncome,
        active_properties: activeProperties,
        rented_properties: rentedProperties,
        average_percentage: activeProperties > 0 ? totalPercentage / activeProperties : 0,
        last_update: new Date().toISOString()
      }
    });
    
    console.log(`Updated income statistics for owner ${ownerId}`);
    
    return {
      totalIncome,
      activeProperties,
      rentedProperties,
      totalPercentage,
      averagePercentage: activeProperties > 0 ? totalPercentage / activeProperties : 0
    };
  } catch (error) {
    console.error(`Error calculating total income for owner ${ownerId}:`, error);
    throw error;
  }
}

// יצירת דוח רווח והפסד לבעל נכס
export async function generateOwnerProfitReport(ownerId, period = 'monthly') {
  try {
    const owner = await Owner.get(ownerId);
    if (!owner) {
      throw new Error(`Owner ${ownerId} not found`);
    }
    
    // מציאת כל הנכסים של בעל הנכס
    const properties = await Property.list();
    const ownerProperties = properties.filter(property => 
      property.owners && 
      property.owners.some(o => o.owner_id === ownerId)
    );
    
    if (ownerProperties.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        properties: []
      };
    }
    
    // מציאת כל התשלומים הקשורים לנכסים אלו
    const payments = await Payment.list();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // הכנת דוח ברמת הנכס
    const propertyReports = [];
    let totalIncome = 0;
    let totalExpenses = 0;
    
    for (const property of ownerProperties) {
      // מציאת אחוז הבעלות
      const ownerInfo = property.owners.find(o => o.owner_id === ownerId);
      const ownerPercentage = ownerInfo ? ownerInfo.percentage : 0;
      
      if (ownerPercentage === 0) continue;
      
      // מציאת תשלומים הקשורים לנכס זה
      const propertyPayments = payments.filter(payment => 
        payment.property_id === property.id
      );
      
      // סינון לפי תקופה
      const filteredPayments = propertyPayments.filter(payment => {
        if (!payment.date) return false;
        
        const paymentDate = new Date(payment.date);
        
        if (period === 'monthly') {
          return paymentDate.getMonth() === currentMonth && 
                 paymentDate.getFullYear() === currentYear;
        } else if (period === 'yearly') {
          return paymentDate.getFullYear() === currentYear;
        }
        
        return true; // ללא סינון
      });
      
      // חישוב הכנסות והוצאות
      let propertyIncome = 0;
      let propertyExpenses = 0;
      
      for (const payment of filteredPayments) {
        // חישוב הסכום היחסי לפי אחוז הבעלות
        const ownerAmount = (payment.amount * ownerPercentage) / 100;
        
        if (payment.type === 'rent' && payment.status === 'paid') {
          propertyIncome += ownerAmount;
        } else if (['maintenance', 'tax', 'committee', 'insurance'].includes(payment.type)) {
          propertyExpenses += ownerAmount;
        }
      }
      
      // הוספה לסיכום הכולל
      totalIncome += propertyIncome;
      totalExpenses += propertyExpenses;
      
      // הכנת דוח לנכס
      propertyReports.push({
        property_id: property.id,
        property_number: property.property_number,
        address: `${property.location?.floor || ''} ${property.building_name || ''}`,
        ownership_percentage: ownerPercentage,
        income: propertyIncome,
        expenses: propertyExpenses,
        net_profit: propertyIncome - propertyExpenses
      });
    }
    
    // הכנת דוח כולל
    const report = {
      owner_id: ownerId,
      owner_name: owner.full_name,
      period,
      report_date: format(now, 'yyyy-MM-dd'),
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      properties: propertyReports
    };
    
    console.log(`Generated profit report for owner ${ownerId}`);
    return report;
  } catch (error) {
    console.error(`Error generating profit report for owner ${ownerId}:`, error);
    throw error;
  }
}

// ייצוא פונקציות נוספות
export {
  updateOwnerProperties,
  updateRelatedTenants,
  updateIncomeDistribution
};