
/**
 * מודול לחישוב שדות נגזרים והורשת מידע בין ישויות
 */

/**
 * חישוב סכום תשלום מתוך נתוני החוזה
 */
export async function calculatePaymentAmount(payment, contract) {
  try {
    if (!contract || !payment) return 0;

    // מציאת החלק היחסי של הדייר בתשלום
    const tenantShare = contract.tenants?.find(t => 
      t.tenant_id === payment.related_to?.id
    )?.share_percentage || 100;

    // חישוב הסכום הבסיסי
    let baseAmount = (contract.monthly_rent * tenantShare) / 100;

    // הוספת הצמדות אם יש
    if (contract.indexation && contract.indexation.type !== 'none') {
      baseAmount = await applyIndexation(baseAmount, contract.indexation);
    }

    // הוספת תשלומים נוספים אם יש
    const additionalCharges = calculateAdditionalCharges(payment, contract);

    return Math.round(baseAmount + additionalCharges);
  } catch (error) {
    console.error("Error calculating payment amount:", error);
    return 0;
  }
}

/**
 * חישוב הצמדות למדד המחירים לצרכן
 */
async function applyCPIIndexation(amount, indexation) {
  // כרגע מחזיר את הסכום ללא שינוי
  // TODO: לממש את חישוב ההצמדה למדד כשיהיה API למדד המחירים לצרכן
  return amount;
}

/**
 * חישוב הצמדות לדולר
 */
async function applyUSDIndexation(amount, indexation) {
  // כרגע מחזיר את הסכום ללא שינוי
  // TODO: לממש את חישוב ההצמדה לדולר כשיהיה API לשער הדולר
  return amount;
}

/**
 * חישוב הצמדות
 */
async function applyIndexation(amount, indexation) {
  try {
    if (!indexation || !amount) return amount;

    switch (indexation.type) {
      case 'consumer_price_index':
        return applyCPIIndexation(amount, indexation);
      case 'usd':
        return applyUSDIndexation(amount, indexation);
      default:
        return amount;
    }
  } catch (error) {
    console.error("Error applying indexation:", error);
    return amount;
  }
}

/**
 * חישוב תשלומים נוספים
 */
function calculateAdditionalCharges(payment, contract) {
  try {
    if (!contract.additional_payments) return 0;

    return contract.additional_payments.reduce((total, charge) => {
      if (charge.included_in_rent && 
          shouldApplyCharge(charge, payment.date)) {
        return total + (charge.amount || 0);
      }
      return total;
    }, 0);
  } catch (error) {
    console.error("Error calculating additional charges:", error);
    return 0;
  }
}

/**
 * בדיקה האם להחיל חיוב נוסף לפי תדירות
 */
function shouldApplyCharge(charge, paymentDate) {
  if (!charge.frequency || !paymentDate) return true;

  const date = new Date(paymentDate);
  switch (charge.frequency) {
    case 'monthly':
      return true;
    case 'bi_monthly':
      return date.getMonth() % 2 === 0;
    case 'quarterly':
      return date.getMonth() % 3 === 0;
    case 'yearly':
      return date.getMonth() === 0;
    default:
      return true;
  }
}

/**
 * חישוב תאריך תשלום הבא
 */
export function calculateNextPaymentDate(contract, lastPaymentDate = null) {
  try {
    if (!contract) return null;

    const paymentDay = contract.payment_terms?.payment_day || 1;
    const today = new Date();
    const startDate = lastPaymentDate ? new Date(lastPaymentDate) : new Date(contract.start_date);
    
    let nextDate = new Date(startDate);
    nextDate.setDate(paymentDay);

    // אם התאריך שהתקבל כבר עבר, קדם לחודש הבא
    if (nextDate < today) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate.toISOString().split('T')[0];
  } catch (error) {
    console.error("Error calculating next payment date:", error);
    return null;
  }
}

/**
 * חישוב סטטוס תשלום
 */
export function calculatePaymentStatus(payment, contract) {
  try {
    if (!payment || !contract) return 'pending';

    const dueDate = new Date(payment.due_date);
    const today = new Date();

    // אם החוזה לא פעיל
    if (contract.status !== 'active') {
      return 'cancelled';
    }

    // אם התשלום כבר שולם
    if (payment.status === 'paid') {
      return 'paid';
    }

    // אם התאריך לתשלום עבר
    if (dueDate < today) {
      return 'late';
    }

    return 'pending';
  } catch (error) {
    console.error("Error calculating payment status:", error);
    return 'pending';
  }
}

/**
 * חישוב סך תשלומים נדרשים
 */
export function calculateTotalRequiredPayments(contract) {
  try {
    if (!contract) return 0;

    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);
    
    // חישוב מספר החודשים בין תאריך ההתחלה לסיום
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                  (endDate.getMonth() - startDate.getMonth()) + 1;

    return Math.max(0, months);
  } catch (error) {
    console.error("Error calculating total required payments:", error);
    return 0;
  }
}

/**
 * חישוב פרטי בעלות לנכס
 */
export function calculatePropertyOwnership(contract, owners) {
  try {
    if (!contract || !owners) return [];

    return owners.map(owner => ({
      owner_id: owner.id,
      share_percentage: owner.share_percentage || 100 / owners.length,
      monthly_income: calculateOwnerIncome(owner, contract)
    }));
  } catch (error) {
    console.error("Error calculating property ownership:", error);
    return [];
  }
}

/**
 * חישוב הכנסה חודשית לבעלים
 */
function calculateOwnerIncome(owner, contract) {
  try {
    if (!owner || !contract) return 0;

    const ownerShare = owner.share_percentage || 100;
    const monthlyRent = contract.monthly_rent || 0;

    return Math.round((monthlyRent * ownerShare) / 100);
  } catch (error) {
    console.error("Error calculating owner income:", error);
    return 0;
  }
}

/**
 * חישוב שדות מחושבים לתשלום
 */
export async function computePaymentFields(payment, contract, tenant) {
  return {
    ...payment,
    amount: await calculatePaymentAmount(payment, contract),
    status: calculatePaymentStatus(payment, contract),
    property_id: contract?.property_id,
    due_date: payment.due_date || calculateNextPaymentDate(contract),
    tenant_details: tenant ? {
      name: tenant.full_name,
      share_percentage: contract?.tenants?.find(t => t.tenant_id === tenant.id)?.share_percentage || 100
    } : null
  };
}

/**
 * חישוב שדות מחושבים לחוזה
 */
export function computeContractFields(contract, property) {
  return {
    ...contract,
    building_id: property?.building_id,
    building_address: property?.building_address,
    total_payments: calculateTotalRequiredPayments(contract),
    next_payment_date: calculateNextPaymentDate(contract),
    property_details: property ? {
      type: property.type,
      address: property.building_address
    } : null
  };
}

/**
 * חישוב שדות מחושבים לנכס
 */
export function computePropertyFields(property, building) {
  return {
    ...property,
    building_details: {
      ...(property.building_details || {}),
      committee: building?.building_committee,
      maintenance_fee: building?.building_committee?.monthly_fee
    },
    full_address: building ? `${building.address.street} ${building.address.number}, ${building.address.city}` : null
  };
}

/**
 * חישוב שדות מחושבים לדייר
 */
export async function computeTenantFields(tenant, contract, property) {
  return {
    ...tenant,
    property_details: property ? {
      address: property.building_address,
      type: property.type
    } : null,
    contract_details: contract ? {
      start_date: contract.start_date,
      end_date: contract.end_date,
      monthly_rent: await calculatePaymentAmount({ related_to: { id: tenant.id } }, contract)
    } : null
  };
}
