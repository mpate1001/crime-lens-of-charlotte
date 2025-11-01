/**
 * UI.JS - Connect the filter controls to the app
 *
 * This file hooks up all the interactive controls - date pickers, dropdowns,
 * reset button, etc. When the user changes a filter, we update the data
 * and refresh the map and charts.
 */

import { state } from './state.js';
import { ELEMENT_IDS, CATEGORY_ORDER, CATEGORY_LABELS, CRIME_CATEGORIES } from './config.js';
import { getCrimeColor, parseDate } from './utils.js';
import { applyFilters } from './filters.js';
import { updateMap } from './mapVisuals.js';
import { updateZipHotspotsChart } from './barChart.js';

// Set up all the filter event listeners
export function wireControls() {
    // Date range controls
    const startInput = document.getElementById(ELEMENT_IDS.startDate);
    const endInput = document.getElementById(ELEMENT_IDS.endDate);

    if (startInput && endInput) {
        startInput.addEventListener('change', () => {
            const startDate = parseDate(startInput.value);
            const endDate = parseDate(endInput.value);

            // Make sure start date comes before end date
            if (startDate && endDate && startDate > endDate) {
                alert('Start date must be before end date');
                startInput.value = state.filters.startDate?.toISOString().split('T')[0] || '';
                return;
            }

            state.filters.startDate = startDate;
            applyFilters();
            refreshVisualizations();
        });

        endInput.addEventListener('change', () => {
            const startDate = parseDate(startInput.value);
            const endDate = parseDate(endInput.value);

            // Make sure end date comes after start date
            if (startDate && endDate && startDate > endDate) {
                alert('End date must be after start date');
                endInput.value = state.filters.endDate?.toISOString().split('T')[0] || '';
                return;
            }

            state.filters.endDate = endDate;
            applyFilters();
            refreshVisualizations();
        });
    }

    // Crime type dropdown (can select multiple)
    const crimeTypeSelect = document.getElementById(ELEMENT_IDS.crimeType);
    if (crimeTypeSelect) {
        crimeTypeSelect.addEventListener('change', () => {
            const selected = Array.from(crimeTypeSelect.selectedOptions).map(opt => opt.value);
            state.filters.crimeTypes = selected.length > 0 ? selected : ['all'];
            applyFilters();
            refreshVisualizations();
        });
    }

    // ZIP code dropdown
    const zipCodeSelect = document.getElementById(ELEMENT_IDS.zipCode);
    if (zipCodeSelect) {
        zipCodeSelect.addEventListener('change', () => {
            const selectedZip = zipCodeSelect.value;
            state.filters.zipCode = selectedZip;
            applyFilters();
            refreshVisualizations();

            // If they picked a specific ZIP, zoom the map to it
            if (selectedZip !== 'all' && state.map && state.data.zipCodes.length > 0) {
                const zipFeature = state.data.zipCodes.find(f =>
                    f.properties.zipCode === selectedZip
                );

                if (zipFeature && zipFeature.geometry) {
                    // Get the boundary coordinates (handle both Polygon and MultiPolygon)
                    const coords = zipFeature.geometry.type === 'Polygon'
                        ? zipFeature.geometry.coordinates[0]
                        : zipFeature.geometry.coordinates[0][0];

                    // Figure out the bounding box of this ZIP
                    const bounds = coords.reduce((bounds, coord) => {
                        return bounds.extend([coord[1], coord[0]]);
                    }, L.latLngBounds(
                        [coords[0][1], coords[0][0]],
                        [coords[0][1], coords[0][0]]
                    ));

                    // Zoom to fit the ZIP boundary
                    state.map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        });
    }

    // Reset button - brings everything back to defaults
    const resetBtn = document.getElementById(ELEMENT_IDS.resetButton);
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Clear all the filter selections
            state.filters.crimeTypes = ['all'];
            state.filters.zipCode = 'all';

            // Set date range back to the full dataset
            const dates = state.data.incidents.map(d => d.date).filter(Boolean);
            if (dates.length > 0) {
                state.filters.startDate = new Date(Math.min(...dates));
                state.filters.endDate = new Date(Math.max(...dates));
            }

            // Update the date inputs to match
            if (startInput && state.filters.startDate) {
                startInput.value = state.filters.startDate.toISOString().split('T')[0];
            }
            if (endInput && state.filters.endDate) {
                endInput.value = state.filters.endDate.toISOString().split('T')[0];
            }

            // Reset the crime type dropdown to "All"
            if (crimeTypeSelect) {
                Array.from(crimeTypeSelect.options).forEach(opt => {
                    opt.selected = opt.value === 'all';
                });
            }

            // Reset the ZIP dropdown to "All"
            if (zipCodeSelect) {
                zipCodeSelect.value = 'all';
            }

            // Zoom map back to Charlotte
            if (state.map) {
                state.map.setView(
                    [35.2271, -80.8431],
                    11
                );
            }

            applyFilters();
            refreshVisualizations();
        });
    }
}

// Fill in the dropdown menus with options from the data
export function populateDropdowns() {
    const crimeTypeSelect = document.getElementById(ELEMENT_IDS.crimeType);
    const zipCodeSelect = document.getElementById(ELEMENT_IDS.zipCode);

    // Fill the crime type dropdown
    if (crimeTypeSelect) {
        // Clear out any old options (but keep the "All" option)
        Array.from(crimeTypeSelect.options).forEach(opt => {
            if (opt.value !== 'all') opt.remove();
        });

        // Add an option for each crime category
        CATEGORY_ORDER.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = CATEGORY_LABELS[category];
            crimeTypeSelect.appendChild(option);
        });
    }

    // Fill the ZIP code dropdown
    if (zipCodeSelect) {
        // Get all the ZIP codes from our boundary data
        const zipCodes = [...new Set(state.data.zipCodes.map(feature =>
            feature.properties.zipCode
        ))]
            .filter(zip => {
                const zipStr = String(zip).trim();
                // Make sure it's a valid Charlotte ZIP (5 digits, starts with "28")
                return zipStr.length === 5 &&
                       zipStr.startsWith('28') &&
                       /^\d{5}$/.test(zipStr);
            })
            .sort();

        // Clear out any old options (but keep the "All" option)
        Array.from(zipCodeSelect.options).forEach(opt => {
            if (opt.value !== 'all') opt.remove();
        });

        // Add an option for each ZIP code
        zipCodes.forEach(zip => {
            const option = document.createElement('option');
            option.value = zip;
            option.textContent = zip;
            zipCodeSelect.appendChild(option);
        });
    }
}

// Draw the crime type guide (clickable cards on left side of map)
export function renderCrimeTypeGuide() {
    const guideContainer = document.getElementById(ELEMENT_IDS.crimeGuide);
    if (!guideContainer) return;

    guideContainer.innerHTML = '';

    // Get modal elements
    const modal = document.getElementById('crimeModal');
    const modalTitle = document.getElementById('modalCrimeTitle');
    const modalList = document.getElementById('modalCrimeList');
    const closeBtn = document.querySelector('.modal-close');

    // Create a clickable card for each crime category
    CATEGORY_ORDER.forEach(category => {
        // Create the category card
        const card = document.createElement('div');
        card.className = 'crime-category-card';

        // Color indicator bar at the top
        const colorBar = document.createElement('div');
        colorBar.className = 'category-color-bar';
        colorBar.style.backgroundColor = getCrimeColor(category);

        // Category header with name
        const header = document.createElement('div');
        header.className = 'category-header';

        const title = document.createElement('h3');
        title.className = 'category-title';
        title.textContent = CATEGORY_LABELS[category];

        header.appendChild(title);

        // Put it together
        card.appendChild(colorBar);
        card.appendChild(header);

        // Click event to open modal/tooltip
        card.addEventListener('click', (e) => {
            e.stopPropagation();

            // Set modal title
            modalTitle.textContent = CATEGORY_LABELS[category];
            modalTitle.style.color = getCrimeColor(category);

            // Clear and populate crime list
            modalList.innerHTML = '';
            const crimes = CRIME_CATEGORIES[category] || [];
            crimes.forEach(crime => {
                const li = document.createElement('li');
                li.textContent = crime;
                modalList.appendChild(li);
            });

            // Show modal
            modal.style.display = 'block';
        });

        guideContainer.appendChild(card);
    });

    // Close modal when clicking X
    if (closeBtn) {
        closeBtn.onclick = function(e) {
            e.stopPropagation();
            modal.style.display = 'none';
        };
    }

    // Close modal when clicking anywhere on the map container
    document.addEventListener('click', function(event) {
        if (modal.style.display === 'block' &&
            !modal.contains(event.target) &&
            !event.target.closest('.crime-category-card')) {
            modal.style.display = 'none';
        }
    });
}

// Update the total incident count display
export function updateIncidentCount() {
    const countElement = document.getElementById(ELEMENT_IDS.incidentCount);
    if (countElement) {
        countElement.textContent = state.filtered.length.toLocaleString();
    }
}

// Helper function to refresh everything after a filter changes
function refreshVisualizations() {
    updateMap();
    updateZipHotspotsChart();
    updateIncidentCount();
}
