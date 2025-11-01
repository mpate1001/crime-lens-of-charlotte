/**
 * MAPVISUALS.JS - Leaflet map with ZIP boundaries and crime markers
 *
 * Sets up the interactive map showing Charlotte ZIP code boundaries and
 * crime incident markers. Handles zoom, pan, click events, and tooltips.
 *
 * Performance tricks:
 * - Only draws markers that are visible on screen (viewport culling)
 * - Debounces zoom/pan so we don't redraw too often
 * - Marker size changes based on zoom level
 */

import { state } from './state.js';
import { MAP_CONFIG, ELEMENT_IDS, CATEGORY_ORDER, CATEGORY_LABELS } from './config.js';
import { getCrimeColor, formatDate, debounce } from './utils.js';
import { applyFilters } from './filters.js';
import { updateZipHotspotsChart } from './barChart.js';
import { updateIncidentCount } from './ui.js';

// Set up the Leaflet map
export function initializeMap() {
    // Clear out any existing map
    if (state.map) {
        state.map.remove();
    }

    const mapElement = document.getElementById(ELEMENT_IDS.map);
    if (!mapElement) {
        console.warn(`Can't find map element #${ELEMENT_IDS.map}`);
        return;
    }

    // Create the map centered on Charlotte
    const map = L.map(mapElement, {
        center: [MAP_CONFIG.centerLat, MAP_CONFIG.centerLon],
        zoom: MAP_CONFIG.defaultZoom,
        zoomControl: true,
        preferCanvas: true  // Faster rendering for lots of markers
    });

    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: MAP_CONFIG.maxZoom,
        minZoom: MAP_CONFIG.minZoom
    }).addTo(map);

    // Save the map and create layers for ZIP boundaries and crime points
    state.map = map;
    state.layers.zipBoundaries = L.layerGroup().addTo(map);
    state.layers.crimePoints = L.layerGroup().addTo(map);

    // Force a redraw (fixes some rendering glitches)
    setTimeout(() => map.invalidateSize(), 100);

    // Track if user clicked a ZIP polygon (so we don't deselect it immediately)
    let layerClickedRecently = false;
    map._zipLayerClicked = () => {
        layerClickedRecently = true;
        setTimeout(() => {
            layerClickedRecently = false;
        }, 100);
    };

    // Click the map background to deselect ZIP filter
    map.on('click', () => {
        if (layerClickedRecently) return;
        if (state.filters.zipCode !== 'all') {
            state.filters.zipCode = 'all';

            // Update the ZIP dropdown to match
            const zipSelect = document.getElementById(ELEMENT_IDS.zipCode);
            if (zipSelect) {
                zipSelect.value = 'all';
            }

            // Apply filters and refresh all visualizations
            applyFilters();
            updateMap();
            updateZipHotspotsChart();
            updateIncidentCount();
        }
    });

    // Update the map when user zooms/pans (but wait a bit so we don't lag)
    const debouncedUpdate = debounce(() => updateMap(true), 150);
    map.on('moveend zoomend', debouncedUpdate);
}

// Refresh the map with current filtered data
// onlyRedrawPoints = true means skip redrawing ZIP boundaries (faster for zoom/pan)
export function updateMap(onlyRedrawPoints = false) {
    const data = state.filtered;
    const zipFeatures = state.data.zipCodes;
    const map = state.map;
    const layers = state.layers;

    if (!map) return;

    // Draw ZIP code boundaries (skip if just zooming/panning)
    if (!onlyRedrawPoints) {
        layers.zipBoundaries.clearLayers();

        // Count how many crimes per ZIP
        const counts = {};
        data.forEach(incident => {
            if (incident.zipCode) {
                counts[incident.zipCode] = (counts[incident.zipCode] || 0) + 1;
            }
        });

        // Draw each ZIP boundary polygon
        zipFeatures.forEach(zipFeature => {
            const zip = zipFeature.properties.zipCode;
            const count = counts[zip] || 0;
            const isSelected = state.filters.zipCode === zip;

            // Style for normal ZIP boundaries
            const baseStyle = {
                fillColor: '#e0e0e0',
                weight: 2,
                opacity: 1,
                color: '#24B24A',
                fillOpacity: 0.3
            };

            // Style for selected ZIP
            const selectedStyle = {
                fillColor: '#EA9B3E',
                weight: 3,
                opacity: 1,
                color: '#EA9B3E',
                fillOpacity: 0.6
            };

            const style = isSelected ? selectedStyle : baseStyle;

            // Add the polygon to the map
            L.geoJSON(zipFeature, {
                style,
                onEachFeature: (_, layer) => {
                    // Change color on hover
                    layer.on({
                        mouseover: e => {
                            if (!isSelected) {
                                e.target.setStyle({
                                    fillColor: '#71BF44',
                                    fillOpacity: 0.7
                                });
                            }
                        },
                        mouseout: e => {
                            if (!isSelected) e.target.setStyle(baseStyle);
                        },
                        click: e => {
                            if (map._zipLayerClicked) map._zipLayerClicked();
                            L.DomEvent.stopPropagation(e);

                            // Click to toggle ZIP filter
                            if (state.filters.zipCode === zip) {
                                state.filters.zipCode = 'all';
                            } else {
                                state.filters.zipCode = zip;
                                const bounds = e.target.getBounds();
                                map.fitBounds(bounds, { padding: [50, 50] });
                            }

                            // Update the ZIP dropdown to match
                            const zipSelect = document.getElementById(ELEMENT_IDS.zipCode);
                            if (zipSelect) {
                                zipSelect.value = state.filters.zipCode;
                            }

                            // Apply filters and refresh all visualizations
                            applyFilters();
                            updateMap();
                            updateZipHotspotsChart();
                            updateIncidentCount();
                        }
                    });

                    // Show ZIP code and count on hover
                    layer.bindTooltip(
                        `<strong>ZIP ${zip}</strong><br/>${count} incident${count !== 1 ? 's' : ''}`,
                        { sticky: true, opacity: 0.9 }
                    );

                    // Popup (click)
                    layer.bindPopup(
                        `<strong>ZIP Code: ${zip}</strong><br/>` +
                        `Incidents: ${count}<br/>` +
                        `<em>Click to ${isSelected ? 'deselect' : 'filter & zoom'}</em>`
                    );
                }
            }).addTo(layers.zipBoundaries);
        });
    }

    // Draw crime markers (only ones visible on screen - saves performance)
    layers.crimePoints.clearLayers();
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const markerRadius = Math.max(2, Math.min(6, (zoom - 9)));  // Bigger markers when zoomed in

    for (const incident of data) {
        if (!incident.latitude || !incident.longitude) continue;

        const latlng = [incident.latitude, incident.longitude];

        // Skip markers outside the current view (viewport culling)
        if (!bounds.contains(latlng)) continue;

        // Create a circle marker
        const marker = L.circleMarker(latlng, {
            radius: markerRadius,
            weight: 1,
            color: '#fff',
            fillColor: getCrimeColor(incident.category),
            fillOpacity: 0.9
        });

        const isSelected = state.filters.crimeTypes.length === 1 &&
                          state.filters.crimeTypes[0] === incident.category;

        // Tooltip on hover
        const tooltipContent =
            `<strong>${incident.type}</strong><br/>` +
            `${formatDate(incident.date)}<br/>` +
            `${CATEGORY_LABELS[incident.category] || incident.category}`;

        marker.bindTooltip(tooltipContent, {
            direction: 'top',
            offset: [0, -5],
            opacity: 0.9
        });

        // Popup on click
        const popupContent =
            `<strong>${incident.type}</strong><br/>` +
            `Date: ${formatDate(incident.date)}<br/>` +
            `Category: ${CATEGORY_LABELS[incident.category] || incident.category}` +
            (incident.address ? `<br/>Location: ${incident.address}` : '') +
            `<br/><em>Click to ${isSelected ? 'deselect' : 'filter by category'}</em>`;

        marker.bindPopup(popupContent);

        // Click to filter by crime category
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);

            if (state.filters.crimeTypes.length === 1 &&
                state.filters.crimeTypes[0] === incident.category) {
                state.filters.crimeTypes = ['all'];
            } else {
                state.filters.crimeTypes = [incident.category];
            }

            // Update the dropdown to match
            const typeSelect = document.getElementById(ELEMENT_IDS.crimeType);
            if (typeSelect) {
                Array.from(typeSelect.options).forEach(option => {
                    option.selected = state.filters.crimeTypes.includes(option.value);
                });
            }

            // Apply filters and refresh all visualizations
            applyFilters();
            updateMap();
            updateZipHotspotsChart();
            updateIncidentCount();
        });

        layers.crimePoints.addLayer(marker);
    }

    // Update the legend too (unless we're just panning/zooming)
    if (!onlyRedrawPoints) {
        updateMapLegend();
    }
}

// Update the map legend showing what each color means
export function updateMapLegend() {
    const legend = d3.select('#' + ELEMENT_IDS.legend);
    if (!legend.node()) return;

    legend.selectAll('*').remove();

    // Add a legend item for each crime category
    CATEGORY_ORDER.forEach(category => {
        const item = legend.append('div').attr('class', 'legend-item');

        // Color box
        item.append('div')
            .attr('class', 'legend-color')
            .style('background-color', getCrimeColor(category));

        // Label
        item.append('span')
            .attr('class', 'legend-label')
            .text(CATEGORY_LABELS[category]);
    });
}
