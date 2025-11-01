/**
 * STATE.JS - App Data Storage
 *
 * This is basically the "brain" of the app - holds all the crime data,
 * filter settings, map references, etc. Everything else reads from or
 * writes to this state object.
 *
 */

import { ELEMENT_IDS } from './config.js';

// The main state object
export const state = {
    // Raw data straight from the CSV files
    raw: {
        incidents: null,
        zipCodes: null
    },

    // Processed data
    data: {
        incidents: [],      // Crime incidents with ZIP codes assigned
        zipCodes: []        // ZIP code boundary polygons
    },

    // Currently filtered data (what's showing on screen)
    filtered: [],

    // What filters the user has selected
    filters: {
        startDate: null,
        endDate: null,
        crimeTypes: ['all'],
        zipCode: 'all'
    },

    // Leaflet map instance
    map: null,

    // Map layers (so we can update them)
    layers: {
        zipBoundaries: null,    // The ZIP code polygons
        crimePoints: null       // The crime markers
    },

    // Spatial index for fast lookups
    zipBboxes: [],

    // Loading state
    isLoading: false
};

// Show the loading spinner
export function showLoading() {
    const overlay = document.getElementById(ELEMENT_IDS.loading);
    if (overlay) overlay.classList.remove('hidden');
    state.isLoading = true;
}

// Hide the loading spinner
export function hideLoading() {
    const overlay = document.getElementById(ELEMENT_IDS.loading);
    if (overlay) overlay.classList.add('hidden');
    state.isLoading = false;
}
