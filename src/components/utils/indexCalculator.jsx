import getBaseParameters from './getBaseParameters';

export async function calculatePaymentIndex(payment, contract) {
    if (!contract || !payment || !payment.date) return 0;
    if (!contract.indexation || contract.indexation.type === 'none') return 0;

    try {
        const baseParams = await getBaseParameters();
        
        switch (contract.indexation.type) {
            case 'consumer_price_index': {
                const currentIndex = baseParams.consumer_price_index.value;
                const baseIndex = contract.indexation.base_index || baseParams.consumer_price_index.value;
                
                if (payment.index_details?.is_index_paid) return 0;
                
                const indexDiff = (currentIndex - baseIndex) / baseIndex;
                return Math.round(payment.amount * indexDiff * 100) / 100;
            }
            
            case 'dollar': {
                const currentRate = baseParams.currency_rates.usd;
                const baseRate = contract.indexation.base_index || baseParams.currency_rates.usd;
                
                if (payment.index_details?.is_index_paid) return 0;
                
                const rateDiff = (currentRate - baseRate) / baseRate;
                return Math.round(payment.amount * rateDiff * 100) / 100;
            }
            
            case 'custom': {
                if (payment.index_details?.is_index_paid) return 0;
                
                const monthsSinceStart = calculateMonthsDifference(
                    new Date(contract.start_date),
                    new Date(payment.date)
                );
                
                const annualRate = contract.indexation.custom_rate || 0;
                const monthlyRate = annualRate / 12;
                
                return Math.round(payment.amount * (monthlyRate * monthsSinceStart) * 100) / 100;
            }
            
            default:
                return 0;
        }
    } catch (error) {
        console.error('Error calculating index:', error);
        return 0;
    }
}

function calculateMonthsDifference(startDate, endDate) {
    return (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
           (endDate.getMonth() - startDate.getMonth());
}