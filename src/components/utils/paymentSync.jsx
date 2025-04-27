import { Payment, Contract } from '@/api/entities';
import { 
    calculatePaymentAmount, 
    calculateNextPaymentDate, 
    calculatePaymentStatus,
    calculateTotalRequiredPayments 
} from './derivedFields';

/**
 * Checks and updates the status of all payments in the system
 */
export async function checkAllPaymentsStatus() {
    try {
        const payments = await Payment.list();
        const contracts = await Contract.list();
        
        for (const payment of payments) {
            try {
                // Skip virtual payments
                if (payment.is_virtual) continue;

                const contract = contracts.find(c => c.id === payment.contract_id);
                
                // Calculate new status based on due date
                const today = new Date();
                const dueDate = new Date(payment.due_date);
                let newStatus = payment.status;

                if (payment.status !== 'paid' && payment.status !== 'cancelled') {
                    if (dueDate < today) {
                        newStatus = 'late';
                    } else {
                        newStatus = 'pending';
                    }
                }

                // If status changed, update the payment
                if (newStatus !== payment.status) {
                    await Payment.update(payment.id, {
                        ...payment,
                        status: newStatus
                    });
                }

            } catch (error) {
                console.error(`Error updating payment ${payment.id}:`, error);
                // Continue with next payment even if one fails
                continue;
            }
        }
        console.log('All payments status checked and updated');
    } catch (error) {
        console.error('Error in checkAllPaymentsStatus:', error);
        throw error;
    }
}

/**
 * Creates a new payment with calculated fields
 */
export async function createPaymentWithDerivedFields(paymentData, contract) {
    try {
        // Calculate derived fields
        const amount = await calculatePaymentAmount(paymentData, contract);
        const status = calculatePaymentStatus(paymentData, contract);
        const nextDate = calculateNextPaymentDate(contract, paymentData.date);

        // Create payment with calculated fields
        const payment = await Payment.create({
            ...paymentData,
            amount,
            status,
            next_payment_date: nextDate
        });

        return payment;
    } catch (error) {
        console.error("Error creating payment with derived fields:", error);
        throw error;
    }
}

/**
 * Updates an existing payment with recalculated fields
 */
export async function updatePaymentWithDerivedFields(paymentId, contract) {
    try {
        const payment = await Payment.get(paymentId);
        if (!payment) throw new Error("Payment not found");

        // Recalculate derived fields
        const amount = await calculatePaymentAmount(payment, contract);
        const status = calculatePaymentStatus(payment, contract);

        // Update payment
        const updatedPayment = await Payment.update(paymentId, {
            ...payment,
            amount,
            status
        });

        return updatedPayment;
    } catch (error) {
        console.error("Error updating payment with derived fields:", error);
        throw error;
    }
}

/**
 * Syncs all payments for a contract
 */
export async function syncContractPayments(contract) {
    try {
        const payments = await Payment.list();
        const contractPayments = payments.filter(p => p.contract_id === contract.id);

        for (const payment of contractPayments) {
            await updatePaymentWithDerivedFields(payment.id, contract);
        }

        console.log(`Synchronized ${contractPayments.length} payments for contract ${contract.id}`);
    } catch (error) {
        console.error("Error syncing contract payments:", error);
        throw error;
    }
}

// Export checkAllPaymentsStatus as default for direct imports
export default checkAllPaymentsStatus;