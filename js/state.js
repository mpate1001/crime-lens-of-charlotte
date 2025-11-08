import { ELEMENT_IDS } from './config.js';

export const state = {
    raw: {
        incidents: null,
        zipCodes: null
    },

    data: {
        incidents: [],
        zipCodes: []
    },

    filtered: [],

    filters: {
        startDate: null,
        endDate: null,
        crimeTypes: ['all'],
        zipCode: 'all'
    },

    map: null,

    layers: {
        zipBoundaries: null,
        crimePoints: null
    },

    zipBboxes: [],
    isLoading: false
};

export function showLoading() {
    const overlay = document.getElementById(ELEMENT_IDS.loading);
    if (overlay) overlay.classList.remove('hidden');
    state.isLoading = true;
}

export function hideLoading() {
    const overlay = document.getElementById(ELEMENT_IDS.loading);
    if (overlay) overlay.classList.add('hidden');
    state.isLoading = false;
}
