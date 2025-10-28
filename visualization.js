// API URLs for fetching data
const API_URLS = {
    incidents: 'https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query?outFields=*&where=1%3D1&f=geojson',
    zipCodes: 'https://meckgis.mecklenburgcountync.gov/server/rest/services/ZipCodeBoundaries/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson'
};

// Crime category definitions
const CRIME_CATEGORIES = {
    violent: ['Murder', 'Aggravated Assault', 'Simple Assault', 'Intimidation', 'Kidnapping', 'Robbery', 'Affray', 'Negligent Manslaughter', 'Justifiable Homicide'],
    sex: ['Forcible Rape', 'Forcible Sodomy', 'Sexual Assault With Object', 'Forcible Fondling', 'Statutory Rape', 'Incest', 'Indecent Exposure', 'Pornography/Obscene Material', 'Prostitution', 'Purchasing Prostitution', 'Assisting Prostitution', 'Human Trafficking, Commercial Sex Acts', 'Human Trafficking, Involuntary Servitude', 'Peeping Tom'],
    property: ['Burglary/B&E', 'Arson', 'Damage/Vandalism Of Property', 'Theft From Building', 'Theft From Motor Vehicle', 'Theft of Motor Vehicle Parts from Vehicle', 'Motor Vehicle Theft', 'Purse-Snatching', 'Pocket-Picking', 'Shoplifting', 'All Other Thefts', 'Theft From Coin-Operated Machine Or Device', 'Stolen Property Offenses'],
    fraud: ['Embezzlement', 'False Pretenses/Swindle', 'Credit Card/Teller Fraud', 'Identity Theft', 'Counterfeiting/Forgery', 'Wire Fraud', 'Hacking/Computer Invasion', 'Welfare Fraud', 'Worthless Check: Felony (over $2000)', 'Bribery', 'Extortion/Blackmail'],
    drug: ['Drug/Narcotic Violations', 'Drug Equipment Violations', 'Liquor Law Violations', 'Driving Under The Influence', 'Overdose'],
    publicOrder: ['Disorderly Conduct', 'Trespass Of Real Property', 'Curfew/Loitering/Vagrancy Violations', 'Gambling Equipment Violations', 'Assisting Gambling', 'Betting/Wagering', 'Family Offenses; Nonviolent'],
    weapons: ['Weapon Law Violations'],
    other: ['All Other Offenses', 'Other Unlisted Non-Criminal', 'Missing Person', 'Suicide', 'Sudden/Natural Death Investigation', 'Public Accident', 'Fire (Accidental/Non-Arson)', 'Gas Leak', 'Vehicle Recovery', 'Animal Cruelty', 'Dog Bite/Animal Control Incident']
};

// Human-friendly category labels
const CATEGORY_LABELS = {
    violent: 'Violent Crimes',
    sex: 'Sex Crimes',
    property: 'Property Crimes',
    fraud: 'Fraud / Financial Crimes',
    drug: 'Drug & Alcohol Offenses',
    publicOrder: 'Public Order Crimes',
    weapons: 'Weapons Offenses',
    other: 'Special / Other Incidents'
};

// Order for displaying categories
const CATEGORY_ORDER = ['violent', 'sex', 'property', 'fraud', 'drug', 'publicOrder', 'weapons', 'other'];

// Color scheme for each crime category
const CATEGORY_COLORS = {
    violent: '#DE0505',
    sex: '#59489F',
    property: '#EA9B3E',
    fraud: '#FADD4A',
    drug: '#02508E',
    publicOrder: '#007953',
    weapons: '#C70000',
    other: '#2F70B8'
};

// HTML element IDs
const ELEMENT_IDS = {
    loading: 'loadingOverlay',
    tooltip: 'tooltip',
    map: 'mapVisualization',
    legend: 'mapLegend',
    startDate: 'startDate',
    endDate: 'endDate',
    crimeType: 'crimeType',
    resetButton: 'resetFilters',
    zipHotspots: 'zipHotspots',
    crimeGuide: 'crimeTypeGrid'
};

// Map configuration
const MAP_CENTER_LAT = 35.2271;
const MAP_CENTER_LON = -80.8431;
const MAP_DEFAULT_ZOOM = 11;
const MAP_MIN_ZOOM = 10;
const MAP_MAX_ZOOM = 18;

// Chart layout constants
const CHART_MARGIN = {top: 20, right: 100, bottom: 150, left: 80};
const CHART_HEIGHT = 750;
const LEGEND_ITEMS_PER_ROW = 4;
const BAR_PADDING = 0.2;

// GLOBAL STATE
const STATE = {
    raw: {incidents: null, zipCodes: null},
    data: {incidents: [], zipCodes: []},
    filtered: [],
    filters: {startDate: null, endDate: null, crimeTypes: ['all'], zipCode: 'all'},
    map: null,
    layers: {zipBoundaries: null, crimePoints: null},
    zipBboxes: [],
    isLoading: false
};

// UTILITY FUNCTIONS
function showLoading() {
    const overlay = document.getElementById(ELEMENT_IDS.loading);
    if (overlay) overlay.classList.remove('hidden');
    STATE.isLoading = true;
}

function hideLoading() {
    const overlay = document.getElementById(ELEMENT_IDS.loading);
    if (overlay) overlay.classList.add('hidden');
    STATE.isLoading = false;
}

function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(+date)) return '';
    return date.toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});
}

function parseDate(value) {
    if (!value && value !== 0) return null;
    if (typeof value === 'number') return new Date(Number(value));
    const d = new Date(value);
    return Number.isNaN(+d) ? null : d;
}

function getCrimeCategory(description) {
    if (!description) return 'other';
    const desc = String(description).toUpperCase();
    for (const [category, keywords] of Object.entries(CRIME_CATEGORIES)) {
        for (const keyword of keywords) {
            if (desc.includes(keyword.toUpperCase())) return category;
        }
    }
    return 'other';
}

function getCrimeColor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

function showTooltip(event, html) {
    const tooltip = d3.select('#' + ELEMENT_IDS.tooltip);
    if (!tooltip.node()) return;
    tooltip.html(html).attr('aria-hidden', 'false');
    const {innerWidth: w, innerHeight: h} = window;
    const bbox = tooltip.node().getBoundingClientRect();
    const x = Math.min(event.pageX + 10, w - bbox.width - 10);
    const y = Math.min(event.pageY - 10, h - bbox.height - 10);
    tooltip.style('left', x + 'px').style('top', y + 'px');
}

function hideTooltip() {
    d3.select('#' + ELEMENT_IDS.tooltip).attr('aria-hidden', 'true');
}

function renderEmptyMessage(containerSelector, message) {
    const root = d3.select(containerSelector);
    if (!root.node()) return;
    root.selectAll('*').remove();
    root.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('height', '100%')
        .style('color', '#6c757d')
        .style('font-size', '16px')
        .text(message);
}

function debounce(fn, wait = 150) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    };
}

// DATA FETCHING
const dataCache = new Map();

async function fetchData(url, label) {
    if (dataCache.has(url)) {
        return dataCache.get(url);
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${label} ${response.status} ${response.statusText}`);
    const json = await response.json();
    dataCache.set(url, json);
    return json;
}

function getPropertyValue(properties, ...keys) {
    for (const key of keys) {
        if (properties[key] !== undefined && properties[key] !== null) {
            return properties[key];
        }
    }
    return null;
}

// SPATIAL ANALYSIS FUNCTIONS

function calculateBoundingBox(geometry) {
    const coordsList = [];
    if (geometry.type === 'Polygon') {
        coordsList.push(...geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(poly => coordsList.push(...poly[0]));
    } else {
        return null;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of coordsList) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return {minX, minY, maxX, maxY};
}

function isPointInRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function isPointInPolygon(point, geometry) {
    const [x, y] = point;
    if (geometry.type === 'Polygon') {
        return isPointInRing(x, y, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
            if (isPointInRing(x, y, polygon[0])) return true;
        }
    }
    return false;
}

function findZipCodeForPoint(longitude, latitude) {
    const candidates = STATE.zipBboxes.filter(bb =>
        longitude >= bb.minX && longitude <= bb.maxX &&
        latitude >= bb.minY && latitude <= bb.maxY
    );

    for (const candidate of candidates) {
        const zipFeature = STATE.data.zipCodes[candidate.idx];
        if (isPointInPolygon([longitude, latitude], zipFeature.geometry)) {
            return zipFeature.properties.zipCode;
        }
    }
    return null;
}

// DATA LOADING & PROCESSING

async function loadAllData() {
    showLoading();
    try {
        const [zipJson, incidentsJson] = await Promise.all([
            fetchData(API_URLS.zipCodes, 'ZIP codes'),
            fetchData(API_URLS.incidents, 'incidents')
        ]);

        STATE.raw.zipCodes = zipJson;
        STATE.raw.incidents = incidentsJson;

        processData();
        hideLoading();
        return true;
    } catch (error) {
        console.error(error);
        hideLoading();
        alert(`Error loading data: ${error.message}\n\nSee console for details.`);
        return false;
    }
}

function processData() {
    processZipCodes();
    processIncidents();
    setDefaultDateFilters();
    applyFilters();
}

function processZipCodes() {
    const zipFeatures = (STATE.raw.zipCodes?.features || [])
        .map(feature => {
            const props = feature.properties || {};
            const zip = getPropertyValue(props, 'ZIPCODE', 'ZIP', 'zip', 'ZIPCODE5', 'ZIP5', 'zip5', 'GEOID', 'geoid', 'NAME', 'name');
            const geom = feature.geometry;
            if (!geom || !zip) return null;
            return {type: 'Feature', geometry: geom, properties: {zipCode: zip, name: zip, ...props}};
        })
        .filter(Boolean);

    STATE.data.zipCodes = zipFeatures;

    STATE.zipBboxes = zipFeatures.map((feature, idx) => {
        const bbox = calculateBoundingBox(feature.geometry);
        return bbox ? {...bbox, idx} : null;
    }).filter(Boolean);
}

function processIncidents() {
    const incidentFeatures = (STATE.raw.incidents?.features || [])
        .map(feature => {
            const props = feature.properties || {};
            const coords = feature.geometry?.coordinates || [];
            const dateValue = getPropertyValue(props, 'DATE_REPORTED', 'date', 'DATE', 'date_reported', 'datetime', 'DATETIME');
            const date = parseDate(dateValue);
            const latitude = coords[1];
            const longitude = coords[0];
            const description = getPropertyValue(props, 'highest_nibrs_description', 'HIGHEST_NIBRS_DESCRIPTION', 'offense_description', 'OFFENSE_DESCRIPTION') || 'Unknown';
            const category = getCrimeCategory(description);
            const address = getPropertyValue(props, 'LOCATION', 'address', 'ADDRESS') || '';
            const objectId = getPropertyValue(props, 'OBJECTID', 'objectid') || Math.random();

            if (!latitude || !longitude || Number.isNaN(latitude) || Number.isNaN(longitude) || !date) return null;

            return {
                id: objectId,
                date: date,
                type: description,
                category: category,
                latitude: latitude,
                longitude: longitude,
                address: address,
                zipCode: getPropertyValue(props, 'zip', 'ZIP', 'zipcode')
            };
        })
        .filter(Boolean);

    assignZipCodes(incidentFeatures);
}

function assignZipCodes(incidents) {
    STATE.data.incidents = incidents.map(incident => {
        if (incident.zipCode) return incident;
        const zip = findZipCodeForPoint(incident.longitude, incident.latitude);
        return zip ? {...incident, zipCode: zip} : incident;
    });
}

function setDefaultDateFilters() {
    const dates = STATE.data.incidents.map(d => d.date).filter(Boolean);
    if (dates.length === 0) return;

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    STATE.filters.startDate = minDate;
    STATE.filters.endDate = maxDate;

    const startInput = document.getElementById(ELEMENT_IDS.startDate);
    const endInput = document.getElementById(ELEMENT_IDS.endDate);
    if (startInput && endInput) {
        startInput.value = minDate.toISOString().split('T')[0];
        endInput.value = maxDate.toISOString().split('T')[0];
        startInput.setAttribute('min', startInput.value);
        startInput.setAttribute('max', endInput.value);
        endInput.setAttribute('min', startInput.value);
        endInput.setAttribute('max', endInput.value);
    }
}

// FILTERING
function applyFilters() {
    let filtered = STATE.data.incidents;

    if (STATE.filters.startDate) {
        filtered = filtered.filter(d => d.date >= STATE.filters.startDate);
    }
    if (STATE.filters.endDate) {
        filtered = filtered.filter(d => d.date <= STATE.filters.endDate);
    }
    if (!STATE.filters.crimeTypes.includes('all')) {
        filtered = filtered.filter(d => STATE.filters.crimeTypes.includes(d.category));
    }
    if (STATE.filters.zipCode !== 'all') {
        filtered = filtered.filter(d => d.zipCode === STATE.filters.zipCode);
    }

    STATE.filtered = filtered;
    updateAllVisualizations();
}

// MAP VISUALIZATION

function initializeMap() {
    if (STATE.map) {
        STATE.map.remove();
    }

    const mapElement = document.getElementById(ELEMENT_IDS.map);
    if (!mapElement) {
        console.warn(`Map element #${ELEMENT_IDS.map} not found`);
        return;
    }

    const map = L.map(mapElement, {
        center: [MAP_CENTER_LAT, MAP_CENTER_LON],
        zoom: MAP_DEFAULT_ZOOM,
        zoomControl: true,
        preferCanvas: true
    });

    L.tileLayer('https://maps.geoapify.com/v1/tile/osm-bright-smooth/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: MAP_MAX_ZOOM,
        minZoom: MAP_MIN_ZOOM
    }).addTo(map);

    STATE.map = map;
    STATE.layers.zipBoundaries = L.layerGroup().addTo(map);
    STATE.layers.crimePoints = L.layerGroup().addTo(map);

    setTimeout(() => map.invalidateSize(), 100);

    let layerClickedRecently = false;
    map._zipLayerClicked = () => {
        layerClickedRecently = true;
        setTimeout(() => {
            layerClickedRecently = false;
        }, 100);
    };

    map.on('click', () => {
        if (layerClickedRecently) return;
        if (STATE.filters.zipCode !== 'all') {
            STATE.filters.zipCode = 'all';
            applyFilters();
        }
    });

    const debouncedUpdate = debounce(() => updateMap(true), 150);
    map.on('moveend zoomend', debouncedUpdate);
}

function updateMap(onlyRedrawPoints = false) {
    const data = STATE.filtered;
    const zipFeatures = STATE.data.zipCodes;
    const map = STATE.map;
    const layers = STATE.layers;

    if (!map) return;

    if (!onlyRedrawPoints) {
        layers.zipBoundaries.clearLayers();

        const counts = {};
        data.forEach(incident => {
            if (incident.zipCode) {
                counts[incident.zipCode] = (counts[incident.zipCode] || 0) + 1;
            }
        });

        zipFeatures.forEach(zipFeature => {
            const zip = zipFeature.properties.zipCode;
            const count = counts[zip] || 0;
            const isSelected = STATE.filters.zipCode === zip;
            const baseStyle = {fillColor: '#e0e0e0', weight: 2, opacity: 1, color: '#24B24A', fillOpacity: 0.3};
            const selectedStyle = {fillColor: '#EA9B3E', weight: 3, opacity: 1, color: '#EA9B3E', fillOpacity: 0.6};
            const style = isSelected ? selectedStyle : baseStyle;

            L.geoJSON(zipFeature, {
                style,
                onEachFeature: (_, layer) => {
                    layer.on({
                        mouseover: e => {
                            if (!isSelected) e.target.setStyle({fillColor: '#71BF44', fillOpacity: 0.7});
                        },
                        mouseout: e => {
                            if (!isSelected) e.target.setStyle(baseStyle);
                        },
                        click: e => {
                            if (map._zipLayerClicked) map._zipLayerClicked();
                            L.DomEvent.stopPropagation(e);

                            if (STATE.filters.zipCode === zip) {
                                STATE.filters.zipCode = 'all';
                            } else {
                                STATE.filters.zipCode = zip;
                                const bounds = e.target.getBounds();
                                map.fitBounds(bounds, {padding: [50, 50]});
                            }
                            applyFilters();
                        }
                    });
                    layer.bindPopup(`<strong>ZIP Code: ${zip}</strong><br/>Incidents: ${count}<br/><em>Click to ${isSelected ? 'deselect' : 'filter & zoom'}</em>`);
                }
            }).addTo(layers.zipBoundaries);
        });
    }

    layers.crimePoints.clearLayers();
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const markerRadius = Math.max(2, Math.min(6, (zoom - 9)));

    for (const incident of data) {
        if (!incident.latitude || !incident.longitude) continue;
        const latlng = [incident.latitude, incident.longitude];
        if (!bounds.contains(latlng)) continue;

        const marker = L.circleMarker(latlng, {
            radius: markerRadius,
            weight: 1,
            color: '#fff',
            fillColor: getCrimeColor(incident.category),
            fillOpacity: 0.9
        });

        const isSelected = STATE.filters.crimeTypes.length === 1 && STATE.filters.crimeTypes[0] === incident.category;
        const popupContent = `<strong>${incident.type}</strong><br/>Date: ${formatDate(incident.date)}<br/>Category: ${CATEGORY_LABELS[incident.category] || incident.category}` +
            (incident.address ? `<br/>Location: ${incident.address}` : '') +
            `<br/><em>Click to ${isSelected ? 'deselect' : 'filter by category'}</em>`;

        marker.bindPopup(popupContent);

        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);

            if (STATE.filters.crimeTypes.length === 1 && STATE.filters.crimeTypes[0] === incident.category) {
                STATE.filters.crimeTypes = ['all'];
            } else {
                STATE.filters.crimeTypes = [incident.category];
            }

            const typeSelect = document.getElementById(ELEMENT_IDS.crimeType);
            if (typeSelect) {
                Array.from(typeSelect.options).forEach(option => {
                    option.selected = STATE.filters.crimeTypes.includes(option.value);
                });
            }

            applyFilters();
        });

        layers.crimePoints.addLayer(marker);
    }

    if (!onlyRedrawPoints) {
        updateMapLegend();
    }
}

function updateMapLegend() {
    const legend = d3.select('#' + ELEMENT_IDS.legend);
    if (!legend.node()) return;
    legend.selectAll('*').remove();

    CATEGORY_ORDER.forEach(category => {
        const item = legend.append('div').attr('class', 'legend-item');
        item.append('div').attr('class', 'legend-color').style('background-color', getCrimeColor(category));
        item.append('span').attr('class', 'legend-label').text(CATEGORY_LABELS[category]);
    });
}

// BAR CHART VISUALIZATION

function updateZipHotspotsChart() {
    const data = STATE.filtered;
    const zipFeatures = STATE.data.zipCodes;
    const svg = d3.select('#' + ELEMENT_IDS.zipHotspots);
    svg.selectAll('*').remove();

    if (!data || data.length === 0) {
        renderEmptyMessage('#' + ELEMENT_IDS.zipHotspots, 'No crime data for selected filters');
        return;
    }

    const byZipCategory = d3.rollup(
        data.filter(d => d.zipCode),
        v => v.length,
        d => d.zipCode,
        d => d.category
    );

    const zipTotals = Array.from(byZipCategory, ([zip, categories]) => ({
        zip,
        total: d3.sum(Array.from(categories.values()))
    }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

    if (zipTotals.length === 0) {
        renderEmptyMessage('#' + ELEMENT_IDS.zipHotspots, 'No ZIP code data available');
        return;
    }

    const zipData = zipTotals.map(({zip, total}) => {
        const row = {zip, total};
        const categories = byZipCategory.get(zip);
        CATEGORY_ORDER.forEach(cat => {
            row[cat] = categories.get(cat) || 0;
        });
        return row;
    });

    const container = document.getElementById(ELEMENT_IDS.zipHotspots);
    const width = container?.clientWidth || 1100;
    const innerWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
    const innerHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;

    svg
        .attr('viewBox', [0, 0, width, CHART_HEIGHT])
        .attr('width', width)
        .attr('height', CHART_HEIGHT)
        .style('max-width', '100%')
        .style('height', 'auto');

    const g = svg.append('g')
        .attr('transform', `translate(${CHART_MARGIN.left},${CHART_MARGIN.top})`);

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(zipData, d => d.total)])
        .range([0, innerWidth]);

    const yScale = d3.scaleBand()
        .domain(zipData.map(d => d.zip))
        .range([0, innerHeight])
        .padding(BAR_PADDING);

    const stack = d3.stack().keys(CATEGORY_ORDER);
    const series = stack(zipData);

    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(',.0f'));
    const yAxis = d3.axisLeft(yScale);

    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .append('text')
        .attr('x', innerWidth / 2)
        .attr('y', 35)
        .attr('fill', '#111827')
        .attr('font-weight', '600')
        .attr('font-size', '16px')
        .attr('text-anchor', 'middle')
        .text('Number of Incidents');

    g.append('g')
        .attr('class', 'axis')
        .call(yAxis)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -60)
        .attr('fill', '#111827')
        .attr('font-weight', '600')
        .attr('font-size', '16px')
        .attr('text-anchor', 'middle')
        .text('ZIP Code');

    const barGroups = g.selectAll('.bar-group')
        .data(series)
        .join('g')
        .attr('class', 'bar-group')
        .attr('fill', d => getCrimeColor(d.key));

    barGroups.selectAll('rect')
        .data(d => d)
        .join('rect')
        .attr('x', d => xScale(d[0]))
        .attr('y', d => yScale(d.data.zip))
        .attr('width', d => xScale(d[1]) - xScale(d[0]))
        .attr('height', yScale.bandwidth())
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
            const category = d3.select(this.parentNode).datum().key;
            const count = d.data[category];
            showTooltip(event, `<strong>ZIP ${d.data.zip}</strong><br/>${CATEGORY_LABELS[category]}: ${count.toLocaleString()}<br/>Total: ${d.data.total.toLocaleString()}<br/><em>Click to filter and zoom</em>`);
        })
        .on('mouseout', hideTooltip)
        .on('click', function (event, d) {
            event.stopPropagation();
            STATE.filters.zipCode = d.data.zip;
            applyFilters();

            const map = STATE.map;
            if (map && zipFeatures && zipFeatures.length > 0) {
                const zipFeature = zipFeatures.find(f => f.properties.zipCode === d.data.zip);
                if (zipFeature && zipFeature.geometry) {
                    const coords = zipFeature.geometry.type === 'Polygon'
                        ? zipFeature.geometry.coordinates[0]
                        : zipFeature.geometry.coordinates[0][0];
                    const bounds = coords.reduce((bounds, coord) => {
                        return bounds.extend([coord[1], coord[0]]);
                    }, L.latLngBounds([coords[0][1], coords[0][0]], [coords[0][1], coords[0][0]]));
                    map.fitBounds(bounds, {padding: [50, 50]});
                }
            }
        });

    g.selectAll('.bar-label')
        .data(zipData)
        .join('text')
        .attr('class', 'bar-label')
        .attr('x', d => xScale(d.total) + 5)
        .attr('y', d => yScale(d.zip) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('fill', '#111827')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text(d => d.total.toLocaleString());

    const legendY = CHART_MARGIN.top + innerHeight + 50;
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${CHART_MARGIN.left}, ${legendY})`);

    const itemWidth = innerWidth / LEGEND_ITEMS_PER_ROW;
    const legendItems = legend.selectAll('.legend-item')
        .data(CATEGORY_ORDER)
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => {
            const row = Math.floor(i / LEGEND_ITEMS_PER_ROW);
            const col = i % LEGEND_ITEMS_PER_ROW;
            return `translate(${col * itemWidth}, ${row * 22})`;
        });

    legendItems.append('rect')
        .attr('width', 14)
        .attr('height', 14)
        .attr('rx', 3)
        .attr('fill', d => getCrimeColor(d));

    legendItems.append('text')
        .attr('x', 20)
        .attr('y', 7)
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .text(d => CATEGORY_LABELS[d]);
}

function updateAllVisualizations() {
    updateMap();
    updateZipHotspotsChart();
}

// EVENT HANDLERS

function setupEventHandlers() {
    const startInput = document.getElementById(ELEMENT_IDS.startDate);
    const endInput = document.getElementById(ELEMENT_IDS.endDate);
    const typeSelect = document.getElementById(ELEMENT_IDS.crimeType);
    const resetBtn = document.getElementById(ELEMENT_IDS.resetButton);

    if (startInput) {
        startInput.addEventListener('change', () => {
            const startDate = new Date(startInput.value);
            const endDate = new Date(endInput.value);
            if (startDate > endDate) endInput.value = startInput.value;
            STATE.filters.startDate = startDate;
            STATE.filters.endDate = new Date(endInput.value);
            applyFilters();
        });
    }

    if (endInput) {
        endInput.addEventListener('change', () => {
            const startDate = new Date(startInput.value);
            const endDate = new Date(endInput.value);
            if (endDate < startDate) startInput.value = endInput.value;
            STATE.filters.startDate = new Date(startInput.value);
            STATE.filters.endDate = endDate;
            applyFilters();
        });
    }

    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            const selected = Array.from(typeSelect.selectedOptions).map(o => o.value);
            STATE.filters.crimeTypes = selected.length ? selected : ['all'];
            applyFilters();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const dates = STATE.data.incidents.map(d => d.date).filter(Boolean);
            if (dates.length) {
                const minDate = new Date(Math.min(...dates));
                const maxDate = new Date(Math.max(...dates));
                STATE.filters.startDate = minDate;
                STATE.filters.endDate = maxDate;
                if (startInput) startInput.value = minDate.toISOString().split('T')[0];
                if (endInput) endInput.value = maxDate.toISOString().split('T')[0];
            }
            STATE.filters.crimeTypes = ['all'];
            if (typeSelect) {
                Array.from(typeSelect.options).forEach(o => (o.selected = o.value === 'all'));
            }
            STATE.filters.zipCode = 'all';
            applyFilters();
        });
    }
}

// CRIME TYPE GUIDE
function renderCrimeTypeGuide() {
    const container = document.getElementById(ELEMENT_IDS.crimeGuide);
    if (!container) return;
    container.innerHTML = '';

    CATEGORY_ORDER.forEach(category => {
        const items = CRIME_CATEGORIES[category] || [];
        const color = getCrimeColor(category);
        const title = CATEGORY_LABELS[category] || category;
        const card = document.createElement('div');
        card.className = 'ct-card';
        card.innerHTML = `
            <h4><span class="ct-dot" style="background:${color}"></span>${title}</h4>
            <ul class="ct-list">
                ${items.map(item => `<li>${item}</li>`).join('')}
            </ul>`;
        container.appendChild(card);
    });
}

// INITIALIZATION
async function initializeApp() {
    if (typeof d3 === 'undefined' || typeof L === 'undefined') {
        setTimeout(initializeApp, 50);
        return;
    }

    try {
        renderCrimeTypeGuide();
        initializeMap();
        setupEventHandlers();
        await loadAllData();
    } catch (error) {
        console.error(error);
        alert(`Error loading application: ${error.message}`);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
