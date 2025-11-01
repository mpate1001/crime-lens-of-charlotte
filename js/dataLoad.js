/**
 * DATALOAD.JS - Load CSV files and convert to GeoJSON
 *
 * Fetches our CSV data files and converts them into GeoJSON format
 * so we can work with them. Also caches the data so we don't have
 * to fetch it multiple times.
 */

import { DATA_SOURCES } from './config.js';

// Cache so we don't load the same file twice
const dataCache = new Map();

// Fetch a CSV file and parse it
export async function fetchCSV(url, label) {
    // Check cache first
    if (dataCache.has(url)) {
        return dataCache.get(url);
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load ${label}: ${response.statusText}`);
    }

    const text = await response.text();
    const data = d3.csvParse(text);  // D3 handles quoted fields properly

    // Cache it for later
    dataCache.set(url, data);
    return data;
}

// Convert CSV rows to GeoJSON format
// (Our CSVs have geometry info embedded in them)
export function csvToGeoJSON(rows) {
    const features = rows.map(row => {
        let geometry = null;

        // Check if it's a Point (crime incident)
        if (row.geometry_type === 'Point' && row.coordinates_lon && row.coordinates_lat) {
            const lon = parseFloat(row.coordinates_lon);
            const lat = parseFloat(row.coordinates_lat);

            if (!isNaN(lon) && !isNaN(lat)) {
                geometry = {
                    type: 'Point',
                    coordinates: [lon, lat]
                };
            }
        }
        // Or a Polygon (ZIP code boundary)
        else if (row.coordinates_json) {
            try {
                geometry = {
                    type: row.geometry_type,
                    coordinates: JSON.parse(row.coordinates_json)
                };
            } catch (e) {
                console.warn('Failed to parse geometry:', e);
            }
        }

        // Grab all the properties (skip geometry columns)
        const properties = {};
        for (const key in row) {
            if (!key.startsWith('geometry') && !key.startsWith('coordinates')) {
                properties[key] = row[key];
            }
        }

        return {
            type: 'Feature',
            geometry,
            properties
        };
    });

    return {
        type: 'FeatureCollection',
        features
    };
}

// Load all the data we need
export async function loadAllData() {
    try {
        // Load both files at the same time (faster)
        const [zipRows, incidentsRows] = await Promise.all([
            fetchCSV(DATA_SOURCES.zipCodes, 'ZIP codes'),
            fetchCSV(DATA_SOURCES.incidents, 'incidents')
        ]);

        // Convert to GeoJSON
        const zipCodes = csvToGeoJSON(zipRows);
        const incidents = csvToGeoJSON(incidentsRows);

        return { zipCodes, incidents };

    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}
