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
import { initializetemporal } from './temporal.js';

export async function init() {
    try {
        showLoading();

        const rawData = await loadAllData();
        processAllData(rawData);
        applyFilters();
        initializeMap();
        populateDropdowns();
        updateMap();
        updateMapLegend();
        updateZipHotspotsChart();
        updateIncidentCount();
        wireControls();
        renderCrimeTypeGuide();
        initializeTabs();
        renderCrimeTreemap();
        initializetemporal();

        hideLoading();
        logSummaryStatistics();

    } catch (error) {
        console.error('Startup failed:', error);
        hideLoading();
        displayErrorMessage(
            'Failed to load application',
            'Try refreshing the page. Check the console for more info.'
        );
    }
}

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

function logSummaryStatistics() {
    const incidents = state.data.incidents;
    const categoryCounts = {};
    incidents.forEach(incident => {
        const cat = incident.category || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const incidentsWithZip = incidents.filter(i => i.zipCode).length;
    const zipSuccessRate = ((incidentsWithZip / incidents.length) * 100).toFixed(1);

    console.log('\nSummary Statistics:');
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
