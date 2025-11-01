/**
 * FILTERS.JS - Apply filters to the crime data
 *
 * Takes the full dataset and filters it based on what the user selected
 * (date range, crime types, ZIP code)
 */

import { state } from './state.js';

// Apply all the active filters to get a subset of data
export function applyFilters() {
    let filtered = state.data.incidents;

    // Filter by date range
    if (state.filters.startDate) {
        filtered = filtered.filter(d => d.date >= state.filters.startDate);
    }

    if (state.filters.endDate) {
        filtered = filtered.filter(d => d.date <= state.filters.endDate);
    }

    // Filter by crime type (can select multiple)
    const selectedTypes = state.filters.crimeTypes;
    if (selectedTypes.length > 0 && !selectedTypes.includes('all')) {
        filtered = filtered.filter(d => selectedTypes.includes(d.category));
    }

    // Filter by ZIP code
    if (state.filters.zipCode && state.filters.zipCode !== 'all') {
        filtered = filtered.filter(d => d.zipCode === state.filters.zipCode);
    }

    // Store the results so our visualizations can use them
    state.filtered = filtered;
}
