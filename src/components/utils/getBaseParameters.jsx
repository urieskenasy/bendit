import { BaseParameters } from '@/api/entities';

/**
 * Fetches the active base parameters from the database
 * @returns {Promise<Object>} The active base parameters
 * @throws {Error} If no active parameters are found or if there's an error fetching
 */
export default async function getBaseParameters() {
    try {
        const allParams = await BaseParameters.list();
        const activeParams = allParams.find(p => p.is_active);
        
        if (!activeParams) {
            throw new Error('No active base parameters found');
        }
        
        return activeParams;
    } catch (error) {
        console.error('Error fetching base parameters:', error);
        throw error;
    }
}