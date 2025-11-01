/**
 * MAIN.JS - Starts up the whole app
 *
 * This is the entry point - loads data, sets up the map and charts,
 * wires up the filter controls, and gets everything running.
 */

import { state, showLoading, hideLoading } from './state.js';
import { DATA_SOURCES } from './config.js';
import { loadAllData } from './dataLoad.js';
import { processAllData } from './dataProcessor.js';
import { applyFilters } from './filters.js';
import { initializeMap, updateMap, updateMapLegend } from './mapVisuals.js';
import { updateZipHotspotsChart } from './barChart.js';
import { wireControls, populateDropdowns, renderCrimeTypeGuide, updateIncidentCount } from './ui.js';
import { initializeTabs } from './tabs.js';
import { renderCrimeTreemap } from './treemap.js';

// Main initialization function - this runs when the page loads
export async function init() {
    try {
        console.log('🚀 Starting Crime Lens of Charlotte...');
        showLoading();

        // Load the CSV data files
        console.log('📊 Loading data...');
        const rawData = await loadAllData();
        console.log('✓ Loaded', rawData.incidents?.features?.length || 0, 'incidents and',
                    rawData.zipCodes?.features?.length || 0, 'ZIP codes');

        // Clean up and process the data
        console.log('⚙️  Processing data...');
        processAllData(rawData);
        console.log('✓ Processed', state.data.incidents.length, 'incidents');

        // Apply filters (starts with everything selected)
        console.log('🔍 Applying filters...');
        applyFilters();
        console.log('✓ Showing', state.filtered.length, 'incidents');

        // Set up the map
        console.log('🗺️  Setting up map...');
        initializeMap();

        // Fill in the dropdowns with options
        console.log('🎛️  Populating dropdowns...');
        populateDropdowns();

        // Draw everything
        console.log('📈 Drawing visualizations...');
        updateMap();
        updateMapLegend();
        updateZipHotspotsChart();
        updateIncidentCount();

        // Wire up the filter controls
        console.log('🔌 Hooking up controls...');
        wireControls();

        // Show the crime category guide
        console.log('📚 Rendering crime guide...');
        renderCrimeTypeGuide();

        // Initialize tab navigation
        console.log('🗂️  Setting up tabs...');
        initializeTabs();

        // Render metrics visualizations
        console.log('📊 Rendering metrics...');
        renderCrimeTreemap();

        // Done!
        hideLoading();
        console.log('✅ App ready!');

        // Show some stats
        logSummaryStatistics();

    } catch (error) {
        console.error('❌ Startup failed:', error);
        hideLoading();

        // Show error to user
        displayErrorMessage(
            'Failed to load application',
            'Try refreshing the page. Check the console for more info.'
        );
    }
}

// Show an error message to the user
function displayErrorMessage(title, message) {
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 500px;
        z-index: 10000;
        text-align: center;
    `;

    errorContainer.innerHTML = `
        <h2 style="color: #DE0505; margin: 0 0 15px 0;">${title}</h2>
        <p style="color: #333; margin: 0 0 20px 0;">${message}</p>
        <button onclick="location.reload()" style="
            background: #24B24A;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        ">Refresh Page</button>
    `;

    document.body.appendChild(errorContainer);
}

// ============================================================================
// STATISTICS & DEBUGGING
// ============================================================================

/**
 * Log summary statistics to console
 * Provides overview of loaded data for debugging
 *
 * Statistics:
 * - Total incidents
 * - Date range
 * - Category breakdown
 * - ZIP code coverage
 * - Spatial join success rate
 *
 * @private
 */
function logSummaryStatistics() {
    const incidents = state.data.incidents;

    // Category counts
    const categoryCounts = {};
    incidents.forEach(incident => {
        const cat = incident.category || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // ZIP code assignment success rate
    const incidentsWithZip = incidents.filter(i => i.zipCode).length;
    const zipSuccessRate = ((incidentsWithZip / incidents.length) * 100).toFixed(1);

    console.log('\n📊 Summary Statistics:');
    console.log('─────────────────────────────────────────');
    console.log(`Total Incidents: ${incidents.length.toLocaleString()}`);
    console.log(`Date Range: ${state.filters.startDate?.toISOString().split('T')[0]} to ${state.filters.endDate?.toISOString().split('T')[0]}`);
    console.log(`ZIP Codes: ${state.data.zipCodes.length}`);
    console.log(`Spatial Join Success: ${zipSuccessRate}% (${incidentsWithZip.toLocaleString()} / ${incidents.length.toLocaleString()})`);
    console.log('\nCategory Breakdown:');
    Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
            const percentage = ((count / incidents.length) * 100).toFixed(1);
            console.log(`  ${category}: ${count.toLocaleString()} (${percentage}%)`);
        });
    console.log('─────────────────────────────────────────\n');
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

/**
 * Bootstrap application when DOM is ready
 * Attaches init function to DOMContentLoaded event
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM already loaded (e.g., script loaded late)
    init();
}
