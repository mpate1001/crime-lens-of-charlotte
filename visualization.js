// Configs
const CONFIG = {
    apis: {
        incidents:
            'https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query?outFields=*&where=1%3D1&f=geojson',
        zipCodes:
            'https://meckgis.mecklenburgcountync.gov/server/rest/services/ZipCodeBoundaries/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson'
    },

    colors: {
        darkGreen: '#24B24A',
        lightGreen: '#71BF44',
        yellow: '#FADD4A',
        orange: '#EA9B3E',
        blue: '#2F70B8',
        medBlue: '#02508E',
        red: '#DE0505',
        darkRed: '#C70000',
        purple: '#59489F',
        navy: '#0C1C35',
        legacyGreen: '#007953'
    },

    crimeCategories: {
        violent: [
            'Murder', 'Aggravated Assault', 'Simple Assault', 'Intimidation', 'Kidnapping', 'Robbery', 'Affray',
            'Negligent Manslaughter', 'Justifiable Homicide'
        ],
        sex: [
            'Forcible Rape', 'Forcible Sodomy', 'Sexual Assault With Object', 'Forcible Fondling', 'Statutory Rape', 'Incest',
            'Indecent Exposure', 'Pornography/Obscene Material', 'Prostitution', 'Purchasing Prostitution',
            'Assisting Prostitution', 'Human Trafficking, Commercial Sex Acts', 'Human Trafficking, Involuntary Servitude', 'Peeping Tom'
        ],
        property: [
            'Burglary/B&E', 'Arson', 'Damage/Vandalism Of Property', 'Theft From Building', 'Theft From Motor Vehicle',
            'Theft of Motor Vehicle Parts from Vehicle', 'Motor Vehicle Theft', 'Purse-Snatching', 'Pocket-Picking',
            'Shoplifting', 'All Other Thefts', 'Theft From Coin-Operated Machine Or Device', 'Stolen Property Offenses'
        ],
        fraud: [
            'Embezzlement', 'False Pretenses/Swindle', 'Credit Card/Teller Fraud', 'Identity Theft', 'Counterfeiting/Forgery',
            'Wire Fraud', 'Hacking/Computer Invasion', 'Welfare Fraud', 'Worthless Check: Felony (over $2000)',
            'Bribery', 'Extortion/Blackmail'
        ],
        drug: [
            'Drug/Narcotic Violations', 'Drug Equipment Violations', 'Liquor Law Violations', 'Driving Under The Influence', 'Overdose'
        ],
        publicOrder: [
            'Disorderly Conduct', 'Trespass Of Real Property', 'Curfew/Loitering/Vagrancy Violations',
            'Gambling Equipment Violations', 'Assisting Gambling', 'Betting/Wagering', 'Family Offenses; Nonviolent'
        ],
        weapons: ['Weapon Law Violations'],
        other: [
            'All Other Offenses', 'Other Unlisted Non-Criminal', 'Missing Person', 'Suicide', 'Sudden/Natural Death Investigation',
            'Public Accident', 'Fire (Accidental/Non-Arson)', 'Gas Leak', 'Vehicle Recovery', 'Animal Cruelty',
            'Dog Bite/Animal Control Incident'
        ]
    },
    map: {width: 1000, height: 600, centerLat: 35.2271, centerLon: -80.8431}
};

// Human-friendly labels & order
const CRIME_CATEGORY_LABELS = {
    violent: 'Violent Crimes',
    sex: 'Sex Crimes',
    property: 'Property Crimes',
    fraud: 'Fraud / Financial Crimes',
    drug: 'Drug & Alcohol Offenses',
    publicOrder: 'Public Order Crimes',
    weapons: 'Weapons Offenses',
    other: 'Special / Other Incidents'
};
const CRIME_CATEGORY_ORDER = ['violent', 'sex', 'property', 'fraud', 'drug', 'publicOrder', 'weapons', 'other'];

// DOM IDs in one place
const DOM = {
    loading: 'loadingOverlay',
    tooltip: 'tooltip',
    map: 'mapVisualization',
    legend: 'mapLegend',
    start: 'startDate',
    end: 'endDate',
    zip: 'zipCode',
    type: 'crimeType',
    reset: 'resetFilters',
    hotspots: 'zipHotspots',
    crimeGuide: 'crimeTypeGrid'
};

// Map defaults
const MAP_DEFAULTS = {
    center: [CONFIG.map.centerLat, CONFIG.map.centerLon],
    zoom: 11, minZoom: 10, maxZoom: 18
};

// GLOBAL STATE
const STATE = {
    raw: {incidents: null, zipCodes: null},
    data: {incidents: [], zipCodes: []},
    view: {incidents: []},
    filters: {startDate: null, endDate: null, crimeTypes: ['all'], zipCode: 'all'},
    maps: {incidents: null},
    layers: {incidents: {zipBoundaries: null, crimePoints: null}},
    isLoading: false,
    zipBboxes: []
};

// UTILS & FIELD GETTERS
const Utils = {
    setLoading(isLoading) {
        const overlay = document.getElementById(DOM.loading);
        if (overlay) overlay.classList.toggle('hidden', !isLoading);
        STATE.isLoading = isLoading;
    },

    formatDate(date) {
        if (!(date instanceof Date) || Number.isNaN(+date)) return '';
        return date.toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});
    },

    parseDate(value) {
        if (!value && value !== 0) return null;
        if (typeof value === 'number') return new Date(Number(value)); // epoch millis
        const d = new Date(value);
        return Number.isNaN(+d) ? null : d;
    },

    categorizeCrime(description) {
        if (!description) return 'other';
        const desc = String(description).toUpperCase();
        for (const [category, keywords] of Object.entries(CONFIG.crimeCategories)) {
            for (const keyword of keywords) {
                if (desc.includes(keyword.toUpperCase())) return category;
            }
        }
        return 'other';
    },

    getCrimeColor(category) {
        const colorMap = {
            violent: CONFIG.colors.red,
            sex: CONFIG.colors.purple,
            property: CONFIG.colors.orange,
            fraud: CONFIG.colors.yellow,
            drug: CONFIG.colors.medBlue,
            publicOrder: CONFIG.colors.legacyGreen,
            weapons: CONFIG.colors.darkRed,
            other: CONFIG.colors.blue
        };
        return colorMap[category] || CONFIG.colors.blue;
    },

    debounce(fn, wait = 150) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    },

    renderEmpty(containerSel, msg) {
        const root = d3.select(containerSel);
        if (!root.node()) return;
        root.selectAll('*').remove();
        root.append('div')
            .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
            .style('height', '100%').style('color', '#6c757d').style('font-size', '16px')
            .text(msg);
    },

    showTooltip(evt, html) {
        const pad = 10;
        const tt = d3.select('#' + DOM.tooltip);
        if (!tt.node()) return;
        tt.html(html).attr('aria-hidden', 'false');
        const {innerWidth: w, innerHeight: h} = window;
        const bbox = tt.node().getBoundingClientRect();
        const x = Math.min(evt.pageX + pad, w - bbox.width - pad);
        const y = Math.min(evt.pageY - pad, h - bbox.height - pad);
        tt.style('left', x + 'px').style('top', y + 'px');
    },

    hideTooltip() {
        d3.select('#' + DOM.tooltip).attr('aria-hidden', 'true');
    }
};

// Property accessors
const Fields = {
    objectId: p => p.OBJECTID ?? p.objectid ?? Math.random(),
    nibrsDesc: p =>
        p.highest_nibrs_description ?? p.HIGHEST_NIBRS_DESCRIPTION ??
        p.offense_description ?? p.OFFENSE_DESCRIPTION ?? 'Unknown',
    zip: p => p.ZIPCODE ?? p.ZIP ?? p.zip ?? p.ZIPCODE5 ?? p.ZIP5 ?? p.zip5 ?? p.GEOID ?? p.geoid ?? p.NAME ?? p.name ?? null,
    date: p => p.DATE_REPORTED ?? p.date ?? p.DATE ?? p.date_reported ?? p.datetime ?? p.DATETIME,
    address: p => p.LOCATION ?? p.address ?? p.ADDRESS ?? ''
};

// Fetch
const Fetcher = (() => {
    const cache = new Map();
    return {
        async get(url, label = 'fetch') {
            if (cache.has(url)) {
                return cache.get(url);
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error(`${label} ${res.status} ${res.statusText}`);
            const json = await res.json();
            cache.set(url, json);
            return json;
        }
    };
})();

// SPATIAL HELPERS (bbox + PIP)
function bboxOfGeometry(geom) {
    const coordsList = [];
    if (geom.type === 'Polygon') {
        coordsList.push(...geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon') {
        // take first ring of each polygon
        geom.coordinates.forEach(poly => coordsList.push(...poly[0]));
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

// Point in ring (ray casting)
function pointInRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

// PIP for Polygon/MultiPolygon
function pointInPolygon([x, y], geometry) {
    if (geometry.type === 'Polygon') {
        return pointInRing(x, y, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
            if (pointInRing(x, y, polygon[0])) return true;
        }
    }
    return false;
}

/** DATA MANAGER */
const DataManager = {
    async loadAll() {
        Utils.setLoading(true);
        try {
            // Fetch all datasets in parallel
            const [zipJson, incJson] = await Promise.all([
                Fetcher.get(CONFIG.apis.zipCodes, 'zip'),
                Fetcher.get(CONFIG.apis.incidents, 'incidents')
            ]);

            STATE.raw.zipCodes = zipJson;
            STATE.raw.incidents = incJson;

            this.ingestAndIndex();
            Utils.setLoading(false);
            return true;
        } catch (e) {
            console.error(e);
            Utils.setLoading(false);
            alert(`Error loading data: ${e.message}\n\nSee console for details.`);
            return false;
        }
    },

    ingestAndIndex() {
        // --- ZIP CODES
        const zipFeatures = (STATE.raw.zipCodes?.features || [])
            .map(f => {
                const props = f.properties || {};
                const zip = Fields.zip(props);
                const geom = f.geometry;
                if (!geom || !zip) return null;
                return {type: 'Feature', geometry: geom, properties: {zipCode: zip, name: zip, ...props}};
            })
            .filter(Boolean);

        STATE.data.zipCodes = zipFeatures;

        // Build bbox index
        STATE.zipBboxes = zipFeatures.map((f, idx) => {
            const bb = bboxOfGeometry(f.geometry);
            return bb ? {...bb, idx} : null;
        }).filter(Boolean);

        // --- INCIDENTS
        const incFeatures = (STATE.raw.incidents?.features || [])
            .map(f => {
                const p = f.properties || {};
                const coords = f.geometry?.coordinates || [];
                const d = Utils.parseDate(Fields.date(p));
                const lat = coords[1], lon = coords[0];
                const type = Fields.nibrsDesc(p);
                const category = Utils.categorizeCrime(type);
                if (!lat || !lon || Number.isNaN(lat) || Number.isNaN(lon) || !d) return null;
                return {
                    id: Fields.objectId(p),
                    date: d,
                    type,
                    category,
                    latitude: lat,
                    longitude: lon,
                    address: Fields.address(p),
                    zipCode: p.zip ?? p.ZIP ?? p.zipcode ?? null
                };
            })
            .filter(Boolean);

        // spatial join (with bbox prefilter) for incidents
        STATE.data.incidents = this.assignZipCodes(incFeatures);

        // Set default date filters safely
        const dates = STATE.data.incidents.map(d => d.date).filter(Boolean);
        if (dates.length) {
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            STATE.filters.startDate = minDate;
            STATE.filters.endDate = maxDate;

            const startInput = document.getElementById(DOM.start);
            const endInput = document.getElementById(DOM.end);
            if (startInput && endInput) {
                startInput.value = minDate.toISOString().split('T')[0];
                endInput.value = maxDate.toISOString().split('T')[0];
                startInput.setAttribute('min', startInput.value);
                startInput.setAttribute('max', endInput.value);
                endInput.setAttribute('min', startInput.value);
                endInput.setAttribute('max', endInput.value);
            }
        }

        this.applyFilters();
    },
    // bbox-prefiltered lookup
    lookupZip([x, y]) {
        // First pass: bbox filter (linear, but much cheaper than PIP over all)
        const candidates = STATE.zipBboxes.filter(bb => x >= bb.minX && x <= bb.maxX && y >= bb.minY && y <= bb.maxY);
        for (const c of candidates) {
            const gf = STATE.data.zipCodes[c.idx];
            if (pointInPolygon([x, y], gf.geometry)) return gf.properties.zipCode;
        }
        return null;
    },
    assignZipCodes(records) {
        let matched = 0, unmatched = 0;
        const out = records.map(rec => {
            if (rec.zipCode) {
                matched++;
                return rec;
            }
            const zip = this.lookupZip([rec.longitude, rec.latitude]);
            if (zip) {
                matched++;
                return {...rec, zipCode: zip};
            }
            unmatched++;
            return rec;
        });
        return out;
    },

    applyFilters() {
        // Incidents
        let inc = STATE.data.incidents;

        if (STATE.filters.startDate) inc = inc.filter(d => d.date >= STATE.filters.startDate);
        if (STATE.filters.endDate) inc = inc.filter(d => d.date <= STATE.filters.endDate);
        if (!STATE.filters.crimeTypes.includes('all')) inc = inc.filter(d => STATE.filters.crimeTypes.includes(d.category));
        if (STATE.filters.zipCode !== 'all') {
            inc = inc.filter(d => d.zipCode === STATE.filters.zipCode);
        }
        STATE.view.incidents = inc;

        Visualizations.renderAll();
    }
};
// Visuals
const Visualizations = {
    initMap() {
        if (STATE.maps.incidents) {
            STATE.maps.incidents.remove();
        }
        const el = document.getElementById(DOM.map);
        if (!el) {
            console.warn(`#${DOM.map} not found`);
            return;
        }
        const map = L.map(el, {
            center: MAP_DEFAULTS.center,
            zoom: MAP_DEFAULTS.zoom,
            zoomControl: true,
            preferCanvas: true
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: MAP_DEFAULTS.maxZoom, minZoom: MAP_DEFAULTS.minZoom
        }).addTo(map);
        STATE.maps.incidents = map;
        STATE.layers.incidents.zipBoundaries = L.layerGroup().addTo(map);
        STATE.layers.incidents.crimePoints = L.layerGroup().addTo(map);
        setTimeout(() => map.invalidateSize(), 100);

        // Track if a layer was just clicked to prevent map click from firing
        let layerClickedRecently = false;

        // Store the layer click handler so we can reference it later
        map._zipLayerClicked = () => {
            layerClickedRecently = true;
            setTimeout(() => {
                layerClickedRecently = false;
            }, 100);
        };

        // Click on map background to deselect ZIP filter
        map.on('click', (e) => {
            // Ignore if a layer was clicked recently
            if (layerClickedRecently) return;

            // Only reset if clicking on empty space (not on a layer)
            if (STATE.filters.zipCode !== 'all') {
                STATE.filters.zipCode = 'all';
                DataManager.applyFilters();
            }
        });

        const debouncedUpdate = Utils.debounce(() => this.updateIncidentsMap(true), 150);
        map.on('moveend zoomend', debouncedUpdate);
    },
    renderAll() {
        this.updateIncidentsMap();
        this.updateZipHotspots();
    },
    updateIncidentsMap(onlyRedrawPoints = false) {
        const data = STATE.view.incidents;
        const zips = STATE.data.zipCodes;
        const map = STATE.maps.incidents;
        const layers = STATE.layers.incidents;
        if (!map) return;
        if (!onlyRedrawPoints) {
            layers.zipBoundaries.clearLayers();
            // counts by zip
            const counts = data.reduce((acc, d) => {
                if (d.zipCode) acc[d.zipCode] = (acc[d.zipCode] || 0) + 1;
                return acc;
            }, {});
            zips.forEach(zipFeature => {
                const zip = zipFeature.properties.zipCode;
                const cnt = counts[zip] || 0;
                const isSelected = STATE.filters.zipCode === zip;
                const baseStyle = {fillColor: '#e0e0e0', weight: 2, opacity: 1, color: '#24B24A', fillOpacity: 0.3};
                const selectedStyle = {fillColor: '#EA9B3E', weight: 3, opacity: 1, color: '#EA9B3E', fillOpacity: 0.6};
                const style = isSelected ? selectedStyle : baseStyle;

                L.geoJSON(zipFeature, {
                    style,
                    onEachFeature: (_, layer) => {
                        layer.on({
                            mouseover: e => {
                                if (!isSelected) {
                                    e.target.setStyle({fillColor: '#71BF44', fillOpacity: 0.7});
                                }
                            },
                            mouseout: e => {
                                if (!isSelected) {
                                    e.target.setStyle(baseStyle);
                                }
                            },
                            click: e => {
                                // Prevent map click handler from firing
                                if (map._zipLayerClicked) map._zipLayerClicked();
                                L.DomEvent.stopPropagation(e);

                                // Toggle ZIP filter
                                if (STATE.filters.zipCode === zip) {
                                    // Deselect - reset to all
                                    STATE.filters.zipCode = 'all';
                                } else {
                                    // Select this ZIP
                                    STATE.filters.zipCode = zip;

                                    // Zoom to bounds
                                    const bounds = e.target.getBounds();
                                    map.fitBounds(bounds, {padding: [50, 50]});
                                }

                                // Apply filters to update all visualizations
                                DataManager.applyFilters();
                            }
                        });
                        layer.bindPopup(`<strong>ZIP Code: ${zip}</strong><br/>Incidents: ${cnt}<br/><em>Click to ${isSelected ? 'deselect' : 'filter & zoom'}</em>`);
                    }
                }).addTo(layers.zipBoundaries);
            });
        }
        layers.crimePoints.clearLayers();
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        const r = Math.max(2, Math.min(6, (zoom - 9)));

        for (const cr of data) {
            if (!cr.latitude || !cr.longitude) continue;
            const latlng = [cr.latitude, cr.longitude];
            if (!bounds.contains(latlng)) continue;

            const marker = L.circleMarker(latlng, {
                radius: r, weight: 1, color: '#fff',
                fillColor: Utils.getCrimeColor(cr.category), fillOpacity: 0.9
            });

            const isSelected = STATE.filters.crimeTypes.length === 1 && STATE.filters.crimeTypes[0] === cr.category;
            const popupContent = `<strong>${cr.type}</strong><br/>Date: ${Utils.formatDate(cr.date)}<br/>Category: ${CRIME_CATEGORY_LABELS[cr.category] || cr.category}` +
                (cr.address ? `<br/>Location: ${cr.address}` : '') +
                `<br/><em>Click to ${isSelected ? 'deselect' : 'filter by category'}</em>`;

            marker.bindPopup(popupContent);

            // Add click handler to filter by crime category
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);

                // Toggle crime type filter
                if (STATE.filters.crimeTypes.length === 1 && STATE.filters.crimeTypes[0] === cr.category) {
                    // Deselect - reset to all
                    STATE.filters.crimeTypes = ['all'];
                } else {
                    // Select this crime category
                    STATE.filters.crimeTypes = [cr.category];
                }

                // Update the crime type select element
                const typeSelect = document.getElementById(DOM.type);
                if (typeSelect) {
                    Array.from(typeSelect.options).forEach(option => {
                        option.selected = STATE.filters.crimeTypes.includes(option.value);
                    });
                }

                // Apply filters to update all visualizations
                DataManager.applyFilters();
            });

            layers.crimePoints.addLayer(marker);
        }

        if (!onlyRedrawPoints) this.updateMapLegend(DOM.legend);
    },
    updateMapLegend(legendId) {
        const legend = d3.select(`#${legendId}`);
        if (!legend.node()) return;
        legend.selectAll('*').remove();

        CRIME_CATEGORY_ORDER.forEach(key => {
            const item = legend.append('div').attr('class', 'legend-item');
            item.append('div').attr('class', 'legend-color').style('background-color', Utils.getCrimeColor(key));
            item.append('span').attr('class', 'legend-label').text(CRIME_CATEGORY_LABELS[key] || key);
        });
    },
    updateZipHotspots() {
        const data = STATE.view.incidents;
        const zipFeatures = STATE.data.zipCodes;
        const sel = d3.select('#' + DOM.hotspots);
        sel.selectAll('*').remove();

        if (!data || data.length === 0) {
            Utils.renderEmpty('#' + DOM.hotspots, 'No crime data for selected filters');
            return;
        }

        // Aggregate incidents by ZIP code and category
        const byZipCategory = d3.rollup(
            data.filter(d => d.zipCode),
            v => v.length,
            d => d.zipCode,
            d => d.category
        );

        // Get top 15 ZIP codes by total count
        const zipTotals = Array.from(byZipCategory, ([zip, categories]) => ({
            zip,
            total: d3.sum(Array.from(categories.values()))
        }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 15);

        if (zipTotals.length === 0) {
            Utils.renderEmpty('#' + DOM.hotspots, 'No ZIP code data available');
            return;
        }

        // Build stacked data for top ZIPs
        const zipData = zipTotals.map(({zip, total}) => {
            const row = {zip, total};
            const categories = byZipCategory.get(zip);
            CRIME_CATEGORY_ORDER.forEach(cat => {
                row[cat] = categories.get(cat) || 0;
            });
            return row;
        });

        // Dimensions
        const container = document.getElementById(DOM.hotspots);
        const width = container?.clientWidth || 1100;
        const height = 750; // Increased to accommodate legend below
        const margin = {top: 20, right: 100, bottom: 150, left: 80};
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Create SVG
        const svg = sel
            .attr('viewBox', [0, 0, width, height])
            .attr('width', width)
            .attr('height', height)
            .style('max-width', '100%')
            .style('height', 'auto');

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(zipData, d => d.total)])
            .range([0, innerWidth]);

        const yScale = d3.scaleBand()
            .domain(zipData.map(d => d.zip))
            .range([0, innerHeight])
            .padding(0.2);

        // Stack the data
        const stack = d3.stack().keys(CRIME_CATEGORY_ORDER);
        const series = stack(zipData);

        // Axes
        const xAxis = d3.axisBottom(xScale)
            .ticks(6)
            .tickFormat(d3.format(',.0f'));

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

        // Draw stacked bars
        const barGroups = g.selectAll('.bar-group')
            .data(series)
            .join('g')
            .attr('class', 'bar-group')
            .attr('fill', d => Utils.getCrimeColor(d.key));

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
                Utils.showTooltip(event, `<strong>ZIP ${d.data.zip}</strong><br/>${CRIME_CATEGORY_LABELS[category]}: ${count.toLocaleString()}<br/>Total: ${d.data.total.toLocaleString()}<br/><em>Click to filter and zoom</em>`);
            })
            .on('mouseout', function () {
                Utils.hideTooltip();
            })
            .on('click', function (event, d) {
                event.stopPropagation();

                // Update ZIP filter
                STATE.filters.zipCode = d.data.zip;
                DataManager.applyFilters();

                // Zoom Leaflet map to this ZIP code
                const map = STATE.maps.incidents;
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

        // Add total labels at end of bars
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

        // Add legend below the chart
        const legendY = margin.top + innerHeight + 50;
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${margin.left}, ${legendY})`);

        // Calculate layout for horizontal legend with wrapping
        const itemsPerRow = 4;
        const itemWidth = innerWidth / itemsPerRow;

        const legendItems = legend.selectAll('.legend-item')
            .data(CRIME_CATEGORY_ORDER)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => {
                const row = Math.floor(i / itemsPerRow);
                const col = i % itemsPerRow;
                return `translate(${col * itemWidth}, ${row * 22})`;
            });

        legendItems.append('rect')
            .attr('width', 14)
            .attr('height', 14)
            .attr('rx', 3)
            .attr('fill', d => Utils.getCrimeColor(d));

        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 7)
            .attr('dy', '0.35em')
            .attr('font-size', '12px')
            .text(d => CRIME_CATEGORY_LABELS[d]);
    }
};

// UI
function wireControls() {
    const startInput = document.getElementById(DOM.start);
    const endInput = document.getElementById(DOM.end);
    const typeSelect = document.getElementById(DOM.type);
    const resetBtn = document.getElementById(DOM.reset);

    if (startInput) startInput.addEventListener('change', () => {
        const s = new Date(startInput.value);
        const e = new Date(endInput.value);
        if (s > e) endInput.value = startInput.value;
        STATE.filters.startDate = s;
        STATE.filters.endDate = new Date(endInput.value);
        DataManager.applyFilters();
    });

    if (endInput) endInput.addEventListener('change', () => {
        const s = new Date(startInput.value);
        const e = new Date(endInput.value);
        if (e < s) startInput.value = endInput.value;
        STATE.filters.startDate = new Date(startInput.value);
        STATE.filters.endDate = e;
        DataManager.applyFilters();
    });

    if (typeSelect) typeSelect.addEventListener('change', () => {
        const selected = Array.from(typeSelect.selectedOptions).map(o => o.value);
        STATE.filters.crimeTypes = selected.length ? selected : ['all'];
        DataManager.applyFilters();
    });

    if (resetBtn) resetBtn.addEventListener('click', () => {
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
        if (typeSelect) Array.from(typeSelect.options).forEach(o => (o.selected = o.value === 'all'));
        STATE.filters.zipCode = 'all';
        DataManager.applyFilters();
    });
}

// Crime-type guide
function renderCrimeTypeGuide() {
    const host = document.getElementById(DOM.crimeGuide);
    if (!host) return;
    host.innerHTML = '';

    CRIME_CATEGORY_ORDER.forEach(key => {
        const items = CONFIG.crimeCategories[key] || [];
        const color = Utils.getCrimeColor(key);
        const title = CRIME_CATEGORY_LABELS[key] || key;
        const card = document.createElement('div');
        card.className = 'ct-card';
        card.innerHTML = `
      <h4><span class="ct-dot" style="background:${color}"></span>${title}</h4>
      <ul class="ct-list">
        ${items.map(it => `<li>${it}</li>`).join('')}
      </ul>`;
        host.appendChild(card);
    });
}

// Wait to load
async function initApp() {
    // Check if D3 and Leaflet are available
    if (typeof d3 === 'undefined' || typeof L === 'undefined') {
        setTimeout(initApp, 50);
        return;
    }

    try {
        renderCrimeTypeGuide();
        Visualizations.initMap();
        wireControls();
        await DataManager.loadAll();
    } catch (e) {
        console.error(e);
        alert(`Error loading application: ${e.message}`);
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}