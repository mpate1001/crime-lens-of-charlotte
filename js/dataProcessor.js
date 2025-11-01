/**
 * DATAPROCESSOR.JS - Clean up and prepare the raw data
 *
 * Takes the raw data from the CSV files and processes it into a format
 * we can actually use. This includes:
 * - Normalizing field names (API data is inconsistent)
 * - Parsing dates and coordinates
 * - Categorizing crimes
 * - Assigning ZIP codes to incidents (spatial join)
 * - Setting up default date filters
 */

import { state } from './state.js';
import { ELEMENT_IDS } from './config.js';
import { parseDate, getCrimeCategory, getPropertyValue } from './utils.js';
import { buildSpatialIndex, assignZipCodes } from './spatial.js';

// Main processing function - runs all the data cleanup steps
export function processAllData(rawData) {
    // Save the raw data
    state.raw.zipCodes = rawData.zipCodes;
    state.raw.incidents = rawData.incidents;

    // Clean it up
    processZipCodes();
    processIncidents();
    setDefaultDateFilters();
}

// Process ZIP code boundaries
// Builds a spatial index for fast lookups
export function processZipCodes() {
    const zipFeatures = (state.raw.zipCodes?.features || [])
        .map(feature => {
            const props = feature.properties || {};

            // Get the ZIP code (column is lowercase 'zip' in our CSV)
            const zip = props.zip;
            const geom = feature.geometry;

            // Skip bad data
            if (!geom || !zip) return null;

            // Return a clean feature
            return {
                type: 'Feature',
                geometry: geom,
                properties: {
                    zipCode: zip,
                    name: zip,
                    ...props
                }
            };
        })
        .filter(Boolean);  // Remove nulls

    // Save the cleaned ZIP codes
    state.data.zipCodes = zipFeatures;

    // Build a spatial index (bounding boxes) so we can quickly find which ZIP a point is in
    state.zipBboxes = buildSpatialIndex(zipFeatures);
}

// Process crime incidents
// Parses dates, categorizes crimes, validates data
export function processIncidents() {
    const incidentFeatures = (state.raw.incidents?.features || [])
        .map(feature => {
            const props = feature.properties || {};
            const coords = feature.geometry?.coordinates || [];

            // Parse the date (column is 'DATE_REPORTED' in our CSV)
            const date = parseDate(props.DATE_REPORTED);

            // Get coordinates (GeoJSON format is [lon, lat])
            const latitude = coords[1];
            const longitude = coords[0];

            // Get the crime description and figure out what category it belongs to
            const description = props.HIGHEST_NIBRS_DESCRIPTION || 'Unknown';
            const category = getCrimeCategory(description);

            // Get address and ID
            const address = props.LOCATION || '';
            const objectId = props.OBJECTID || Math.random();

            // Skip incidents with bad/missing data
            if (!latitude || !longitude ||
                Number.isNaN(latitude) || Number.isNaN(longitude) ||
                !date) {
                return null;
            }

            // Return a clean incident object
            return {
                id: objectId,
                date,
                type: description,
                category,
                latitude,
                longitude,
                address,
                zipCode: props.ZIP  // Column is uppercase 'ZIP' in our CSV
            };
        })
        .filter(Boolean);  // Remove nulls

    // Use spatial join to figure out which ZIP code each incident is in
    // (Some incidents don't have ZIP codes in the data, so we calculate it)
    const enrichedIncidents = assignZipCodes(
        incidentFeatures,
        state.zipBboxes,
        state.data.zipCodes
    );

    // Save the processed incidents
    state.data.incidents = enrichedIncidents;
}

// Set up the default date range for the filter
// Uses the earliest and latest dates from the actual data
export function setDefaultDateFilters() {
    const dates = state.data.incidents
        .map(d => d.date)
        .filter(Boolean);

    if (dates.length === 0) return;

    // Find the earliest and latest dates
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Set the filter defaults
    state.filters.startDate = minDate;
    state.filters.endDate = maxDate;

    // Update the date inputs in the UI
    const startInput = document.getElementById(ELEMENT_IDS.startDate);
    const endInput = document.getElementById(ELEMENT_IDS.endDate);

    if (startInput && endInput) {
        const startStr = minDate.toISOString().split('T')[0];
        const endStr = maxDate.toISOString().split('T')[0];

        startInput.value = startStr;
        endInput.value = endStr;

        // Set min/max so user can't pick dates outside the data range
        startInput.setAttribute('min', startStr);
        startInput.setAttribute('max', endStr);
        endInput.setAttribute('min', startStr);
        endInput.setAttribute('max', endStr);
    }
}
