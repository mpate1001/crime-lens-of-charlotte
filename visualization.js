/* Crime Lens of Charlotte — Refactored */

/* CONFIG & CONSTANTS */
const CONFIG = {
    apis: {
        incidents:
            'https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query?outFields=*&where=1%3D1&f=geojson',
        zipCodes:
            'https://meckgis.mecklenburgcountync.gov/server/rest/services/ZipCodeBoundaries/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
        homicides:
            'https://gis.charlottenc.gov/arcgis/rest/services/ODP/CMPD_Homicide/MapServer/0/query?outFields=*&where=1%3D1&f=geojson',
        violentCrime:
            'https://gis.charlottenc.gov/arcgis/rest/services/ODP/ViolentCrimeData/MapServer/0/query?outFields=*&where=1%3D1&f=json'
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

// Legend order & colors for violent stacked area
const OFFENSE_TYPE_COLORS = {
    Homicide: CONFIG.colors.darkRed,
    'Aggravated Assault-Gun': CONFIG.colors.red,
    'Non-Fatal Gunshot Injury': CONFIG.colors.navy,
    'Aggravated Assault-Knife': CONFIG.colors.orange,
    'Aggravated Assault-Other Weapon': CONFIG.colors.yellow,
    'Aggravated Assault-Fists,Feet, etc.': CONFIG.colors.lightGreen,
    'Armed Robbery': CONFIG.colors.medBlue,
    'Strong Arm Robbery': CONFIG.colors.blue,
    Rape: CONFIG.colors.purple,
    'Attempted Rape': CONFIG.colors.legacyGreen,
    'Violent Crime': CONFIG.colors.darkGreen
};
const OFFENSE_LEGEND_ORDER = [
    'Homicide', 'Aggravated Assault-Knife', 'Strong Arm Robbery', 'Rape', 'Aggravated Assault-Fists,Feet, etc.',
    'Attempted Rape', 'Aggravated Assault-Gun', 'Aggravated Assault-Other Weapon', 'Armed Robbery', 'Violent Crime',
    'Non-Fatal Gunshot Injury'
];

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
    treemap: 'homicidesTreemap',
    stacked: 'violentStackedArea',
    trend: 'trendVisualization',
    dist: 'distributionVisualization',
    crimeGuide: 'crimeTypeGrid'
};

// Map defaults
const MAP_DEFAULTS = {
    center: [CONFIG.map.centerLat, CONFIG.map.centerLon],
    zoom: 11, minZoom: 10, maxZoom: 18
};

/** GLOBAL STATE */
const STATE = {
    raw: {incidents: null, zipCodes: null, homicides: null, violentCrime: null},
    data: {incidents: [], zipCodes: [], homicides: [], violentMonthly: []},
    view: {incidents: [], homicides: [], violentMonthly: []},
    filters: {startDate: null, endDate: null, crimeTypes: ['all'], zipCode: 'all'},
    maps: {incidents: null},
    layers: {incidents: {zipBoundaries: null, crimePoints: null}},
    _canvasRenderer: null,
    _moveHandler: null,
    isLoading: false,
    // light-weight bbox index for zip polygons
    zipBboxes: [] // [{minX,maxX,minY,maxY, idx}]
};

/** UTILS & FIELD GETTERS */
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

    formatNumber(num) {
        if (num == null) return '';
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
    },

    assertEl(id) {
        const el = document.getElementById(id);
        if (!el) throw new Error(`Missing DOM element: #${id}`);
        return el;
    },

    assertFeatures(json, name) {
        if (!json || !Array.isArray(json.features)) {
            throw new Error(`${name} response missing 'features' array`);
        }
        return json.features;
    }
};

// Property accessors (isolate upstream schema drift)
const Fields = {
    objectId: p => p.OBJECTID ?? p.objectid ?? Math.random(),
    nibrsDesc: p =>
        p.highest_nibrs_description ?? p.HIGHEST_NIBRS_DESCRIPTION ??
        p.offense_description ?? p.OFFENSE_DESCRIPTION ?? 'Unknown',
    nibrsCode: p => p.highest_nibrs_code ?? p.HIGHEST_NIBRS_CODE ?? null,
    zip: p => p.ZIPCODE ?? p.ZIP ?? p.zip ?? p.ZIPCODE5 ?? p.ZIP5 ?? p.zip5 ?? p.GEOID ?? p.geoid ?? p.NAME ?? p.name ?? null,
    date: p => p.DATE_REPORTED ?? p.date ?? p.DATE ?? p.date_reported ?? p.datetime ?? p.DATETIME,
    address: p => p.LOCATION ?? p.address ?? p.ADDRESS ?? '',
    division: p => p.CMPD_PATROL_DIVISION ?? 'Unknown',
    weapon: p => p.WEAPON ?? 'Unknown',
    clearance: p => p.CLEARANCE_STATUS ?? 'Unknown',
    circumstances: p => p.CIRCUMSTANCES ?? 'Unknown',
    age: p => p.AGE,
    gender: p => p.GENDER,
    race: p => p.RACE_ETHNICITY,
    violentAttrs: props => props.attributes ?? props.properties ?? props
};

/** FETCHER (abortable + cache) */
const Fetcher = (() => {
    let controller = null;
    const cache = new Map();
    return {
        async get(url, label = 'fetch') {
            if (cache.has(url)) return cache.get(url);
            if (controller) controller.abort();
            controller = new AbortController();
            const res = await fetch(url, {signal: controller.signal});
            if (!res.ok) throw new Error(`${label} ${res.status} ${res.statusText}`);
            const json = await res.json();
            cache.set(url, json);
            return json;
        }
    };
})();

/** SPATIAL HELPERS (bbox + PIP) */

// Compute bbox for Polygon or MultiPolygon [[[]]]
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
            // ZIPs
            const zipJson = await Fetcher.get(CONFIG.apis.zipCodes, 'zip');
            STATE.raw.zipCodes = zipJson;
            // Incidents
            const incJson = await Fetcher.get(CONFIG.apis.incidents, 'incidents');
            STATE.raw.incidents = incJson;
            // Homicides
            const homJson = await Fetcher.get(CONFIG.apis.homicides, 'homicides');
            STATE.raw.homicides = homJson;
            // Violent aggregated
            const vioJson = await Fetcher.get(CONFIG.apis.violentCrime, 'violent');
            STATE.raw.violentCrime = vioJson;

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
        const zipFeatures = Utils.assertFeatures(STATE.raw.zipCodes, 'zipCodes')
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
        const incFeatures = Utils.assertFeatures(STATE.raw.incidents, 'incidents')
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
                    zipCode: p.zip ?? p.ZIP ?? p.zipcode ?? null,
                    nibrsCode: Fields.nibrsCode(p)
                };
            })
            .filter(Boolean);

        // --- HOMICIDES
        const homFeatures = Utils.assertFeatures(STATE.raw.homicides, 'homicides')
            .map(f => {
                const p = f.properties || {};
                const coords = f.geometry?.coordinates || [];
                const d = Utils.parseDate(Fields.date(p));
                const lat = coords[1], lon = coords[0];
                if (!lat || !lon || Number.isNaN(lat) || Number.isNaN(lon) || !d) return null;
                return {
                    id: Fields.objectId(p),
                    date: d,
                    type: Fields.nibrsDesc(p) || 'Homicide',
                    category: 'violent',
                    latitude: lat,
                    longitude: lon,
                    address: Fields.address(p),
                    zipCode: p.zip ?? p.ZIP ?? p.zipcode ?? null,
                    nibrsCode: Fields.nibrsCode(p),
                    division: Fields.division(p),
                    weapon: Fields.weapon(p),
                    clearanceStatus: Fields.clearance(p),
                    circumstances: Fields.circumstances(p),
                    age: Fields.age(p),
                    gender: Fields.gender(p),
                    race: Fields.race(p)
                };
            })
            .filter(Boolean);

        // --- VIOLENT (aggregated rows: month/type/count)
        const vioRows = (STATE.raw.violentCrime.features || [])
            .map(feat => {
                const props = Fields.violentAttrs(feat);
                const year = +props.CALENDAR_YEAR || +props.calendar_year;
                const month = +props.CALENDAR_MONTH || +props.calendar_month;
                const date = (year && month) ? new Date(year, month - 1, 1) :
                    Utils.parseDate(props.date || props.DATE || props.date_reported || props.DATE_REPORTED);
                if (!date) return null;
                return {
                    id: props.OBJECTID ?? props.objectid ?? Math.random(),
                    date,
                    type: props.OFFENSE_DESCRIPTION ?? props.offense_description ?? 'Violent Crime',
                    category: 'violent',
                    count: +props.OFFENSE_COUNT || +props.offense_count || 1
                };
            })
            .filter(Boolean);

        // spatial join (with bbox prefilter) for incidents & homicides
        STATE.data.incidents = this.assignZipCodes(incFeatures);
        STATE.data.homicides = this.assignZipCodes(homFeatures);
        STATE.data.violentMonthly = vioRows;

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

        this.populateZipDropdown();
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
        console.log(`Spatial join: ${matched} matched, ${unmatched} unmatched`);
        return out;
    },

    populateZipDropdown() {
        const select = document.getElementById(DOM.zip);
        if (!select) return;
        // Clear and rebuild
        select.innerHTML = '<option value="all">All</option>';
        const zips = [...new Set(
            STATE.data.zipCodes
                .map(f => f.properties.zipCode)
                .filter(z => z && String(z).length === 5)
        )].sort((a, b) => String(a).localeCompare(String(b)));
        for (const z of zips) {
            const opt = document.createElement('option');
            opt.value = z;
            opt.textContent = z;
            select.appendChild(opt);
        }
    },
    applyFilters() {
        // Incidents
        let inc = STATE.data.incidents;
        if (STATE.filters.startDate) inc = inc.filter(d => d.date >= STATE.filters.startDate);
        if (STATE.filters.endDate) inc = inc.filter(d => d.date <= STATE.filters.endDate);
        if (!STATE.filters.crimeTypes.includes('all')) inc = inc.filter(d => STATE.filters.crimeTypes.includes(d.category));
        if (STATE.filters.zipCode !== 'all') inc = inc.filter(d => d.zipCode === STATE.filters.zipCode);
        STATE.view.incidents = inc;
        // Homicides
        let hom = STATE.data.homicides;
        if (STATE.filters.startDate) hom = hom.filter(d => d.date >= STATE.filters.startDate);
        if (STATE.filters.endDate) hom = hom.filter(d => d.date <= STATE.filters.endDate);
        if (STATE.filters.zipCode !== 'all') hom = hom.filter(d => d.zipCode === STATE.filters.zipCode);
        STATE.view.homicides = hom;
        // Violent monthly aggregated
        let vio = STATE.data.violentMonthly;
        if (STATE.filters.startDate) vio = vio.filter(d => d.date >= STATE.filters.startDate);
        if (STATE.filters.endDate) vio = vio.filter(d => d.date <= STATE.filters.endDate);
        STATE.view.violentMonthly = vio;
        Visualizations.renderAll();
    }
};
/** VISUALIZATIONS */
const Visualizations = {
    initMap() {
        // Clean up existing
        if (STATE.maps.incidents) {
            if (STATE._moveHandler) {
                STATE.maps.incidents.off('moveend zoomend', STATE._moveHandler);
                STATE._moveHandler = null;
            }
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
        STATE._canvasRenderer = STATE._canvasRenderer || L.canvas({padding: 0.5});
        setTimeout(() => map.invalidateSize(), 100);
        STATE._moveHandler = Utils.debounce(() => this.updateIncidentsMap(true), 150);
        map.on('moveend zoomend', STATE._moveHandler);
    },
    renderAll() {
        this.updateIncidentsMap();
        this.updateHomicidesTreemap();
        this.updateViolentStackedArea();
        this.updateTrendChart();
        this.updateDistributionChart();
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
                const style = {fillColor: '#e0e0e0', weight: 2, opacity: 1, color: '#24B24A', fillOpacity: 0.3};
                L.geoJSON(zipFeature, {
                    style,
                    onEachFeature: (_, layer) => {
                        layer.on({
                            mouseover: e => e.target.setStyle({fillColor: '#71BF44', fillOpacity: 0.7}),
                            mouseout: e => e.target.setStyle(style)
                        });
                        layer.bindPopup(`<strong>ZIP Code: ${zip}</strong><br/>Incidents: ${cnt}`);
                    }
                }).addTo(layers.zipBoundaries);
            });
        }
        layers.crimePoints.clearLayers();
        const bounds = map.getBounds();
        const renderer = STATE._canvasRenderer || (STATE._canvasRenderer = L.canvas({padding: 0.5}));
        const zoom = map.getZoom();
        const r = Math.max(2, Math.min(6, (zoom - 9))); // 2..6

        for (const cr of data) {
            if (!cr.latitude || !cr.longitude) continue;
            const latlng = [cr.latitude, cr.longitude];
            if (!bounds.contains(latlng)) continue;

            const marker = L.circleMarker(latlng, {
                renderer, radius: r, weight: 1, color: '#fff',
                fillColor: Utils.getCrimeColor(cr.category), fillOpacity: 0.9
            });
            marker.bindPopup(
                `<strong>${cr.type}</strong><br/>Date: ${Utils.formatDate(cr.date)}<br/>Category: ${cr.category}` +
                (cr.address ? `<br/>Location: ${cr.address}` : '')
            );
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
    updateHomicidesTreemap() {
        const data = STATE.view.homicides;
        const sel = d3.select('#' + DOM.treemap);
        sel.selectAll('*').remove();
        if (!data || data.length === 0) {
            Utils.renderEmpty('#' + DOM.treemap, 'No homicide data for selected filters');
            return;
        }
        const container = document.getElementById(DOM.treemap);
        const width = container.clientWidth || 900;
        const height = 600;
        const svg = sel.append('svg').attr('width', width).attr('height', height);

        const nested = d3.group(data, d => d.division, d => d.weapon);
        const rootData = {
            name: 'Homicides',
            children: Array.from(nested, ([division, weapons]) => ({
                name: division,
                children: Array.from(weapons, ([weapon, items]) => ({name: weapon, value: items.length, data: items}))
            }))
        };
        const root = d3.hierarchy(rootData).sum(d => d.value).sort((a, b) => b.value - a.value);
        d3.treemap().size([width, height]).padding(3).round(true)(root);

        const divisions = Array.from(new Set(data.map(d => d.division)));
        const colorScale = d3.scaleOrdinal().domain(divisions).range([
            CONFIG.colors.red, CONFIG.colors.darkRed, CONFIG.colors.orange, CONFIG.colors.purple, CONFIG.colors.medBlue,
            CONFIG.colors.blue, CONFIG.colors.legacyGreen, CONFIG.colors.darkGreen, '#8B4513', '#FF6B6B', '#4ECDC4', '#95E1D3'
        ]);

        const cell = svg.selectAll('g').data(root.leaves()).enter().append('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);

        cell.append('rect')
            .attr('class', 'treemap-cell')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', d => colorScale(d.parent.data.name))
            .attr('stroke', '#fff').attr('stroke-width', 2)
            .on('mouseover', (event, d) => {
                const division = d.parent.data.name;
                const weapon = d.data.name;
                const count = d.value;
                const pct = ((count / data.length) * 100).toFixed(1);
                Utils.showTooltip(event, `<strong>${division}</strong><br/>Weapon: ${weapon}<br/>Count: ${count} (${pct}%)`);
            })
            .on('mouseout', Utils.hideTooltip);
        // Lbels
        cell.append('text')
            .attr('class', 'treemap-label')
            .attr('x', d => (d.x1 - d.x0) / 2)
            .attr('y', d => (d.y1 - d.y0) / 2 - 8)
            .attr('text-anchor', 'middle')
            .text(d => {
                const w = d.x1 - d.x0, h = d.y1 - d.y0;
                if (w > 80 && h > 50) {
                    const weapon = d.data.name;
                    return weapon.length > 15 ? weapon.substring(0, 12) + '...' : weapon;
                }
                return '';
            });
        cell.append('text')
            .attr('class', 'treemap-sublabel')
            .attr('x', d => (d.x1 - d.x0) / 2)
            .attr('y', d => (d.y1 - d.y0) / 2 + 8)
            .attr('text-anchor', 'middle')
            .text(d => {
                const w = d.x1 - d.x0, h = d.y1 - d.y0;
                return (w > 50 && h > 40) ? d.value : '';
            });
        cell.append('text')
            .attr('class', 'treemap-sublabel')
            .style('font-size', '9px').style('opacity', '0.8')
            .attr('x', d => (d.x1 - d.x0) / 2)
            .attr('y', d => (d.y1 - d.y0) / 2 + 22)
            .attr('text-anchor', 'middle')
            .text(d => {
                const w = d.x1 - d.x0, h = d.y1 - d.y0;
                if (w > 80 && h > 60) {
                    const division = d.parent.data.name;
                    return division.length > 12 ? division.substring(0, 10) + '...' : division;
                }
                return '';
            });
    },
    updateViolentStackedArea() {
        const data = STATE.view.violentMonthly;
        const root = d3.select('#' + DOM.stacked);
        root.selectAll('*').remove();
        if (!data || data.length === 0) {
            Utils.renderEmpty('#' + DOM.stacked, 'No violent-crime data for selected filters');
            return;
        }
        const container = root.node();
        const width = (container?.clientWidth || 900);
        const height = 600;
        const margin = {top: 30, right: 180, bottom: 50, left: 60};
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;
        const svg = root.append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        const monthKey = d => d3.timeMonth(d.date);
        const byMonthType = d3.rollup(
            data, v => d3.sum(v, d => d.count || 1),
            d => monthKey(d), d => d.type || 'Unknown'
        );
        const months = Array.from(byMonthType.keys()).sort(d3.ascending);
        const typesPresent = Array.from(new Set(data.map(d => d.type || 'Unknown')));
        const keys = [
            ...OFFENSE_LEGEND_ORDER.filter(k => typesPresent.includes(k)),
            ...typesPresent.filter(k => !OFFENSE_LEGEND_ORDER.includes(k)).sort()
        ];
        const rows = months.map(m => {
            const row = {date: m};
            keys.forEach(k => {
                row[k] = byMonthType.get(m)?.get(k) || 0;
            });
            return row;
        });

        const x = d3.scaleTime().domain(d3.extent(months)).range([0, w]);
        const stack = d3.stack().keys(keys);
        const series = stack(rows);
        const y = d3.scaleLinear().domain([0, d3.max(series, s => d3.max(s, d => d[1]))]).nice().range([h, 0]);

        const fallbackScale = d3.scaleOrdinal().domain(keys).range(
            [
                CONFIG.colors.darkRed, CONFIG.colors.red, CONFIG.colors.orange, CONFIG.colors.yellow, CONFIG.colors.purple,
                CONFIG.colors.medBlue, CONFIG.colors.blue, CONFIG.colors.navy, CONFIG.colors.darkGreen,
                CONFIG.colors.legacyGreen, CONFIG.colors.lightGreen
            ].slice(0, keys.length)
        );
        const offenseColor = k => OFFENSE_TYPE_COLORS[k] || fallbackScale(k);
        // grid + axes
        g.append('g').attr('class', 'grid').attr('opacity', 0.1).call(d3.axisLeft(y).tickSize(-w).tickFormat(''));
        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(8));
        g.append('g').attr('class', 'axis').call(d3.axisLeft(y));

        const area = d3.area().x(d => x(d.data.date)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveMonotoneX);

        g.selectAll('.area-layer').data(series).enter().append('path')
            .attr('class', 'area-layer').attr('d', area)
            .attr('fill', d => offenseColor(d.key)).attr('opacity', 0.9);

        // legend
        const legendKeys = keys;
        const legend = svg.append('g')
            .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`)
            .attr('class', 'stacked-legend');

        const item = legend.selectAll('g').data(legendKeys).enter().append('g')
            .attr('transform', (d, i) => `translate(0, ${i * 22})`)
            .attr('tabindex', 0)
            .style('cursor', 'pointer')
            .on('mouseover', (e, d) => {
                g.selectAll('.area-layer').style('opacity', s => (s.key === d ? 1 : 0.15));
            })
            .on('mouseout', () => g.selectAll('.area-layer').style('opacity', 0.9));

        item.append('rect').attr('width', 14).attr('height', 14).attr('rx', 3).attr('ry', 3).attr('fill', d => offenseColor(d));
        item.append('text').attr('x', 20).attr('y', 11).style('font-size', '12px').text(d => d);

        // tooltip overlay
        const overlay = g.append('rect').attr('fill', 'transparent').attr('pointer-events', 'all').attr('width', w).attr('height', h);
        const bisect = d3.bisector(d => d.date).center;
        overlay.on('mousemove', event => {
            const xm = d3.pointer(event, overlay.node())[0];
            const date = x.invert(xm);
            const idx = bisect(rows, date);
            const row = rows[Math.max(0, Math.min(rows.length - 1, idx))];
            const total = keys.reduce((acc, k) => acc + (row[k] || 0), 0);
            const lines = keys.map(k => `<div><strong>${k}:</strong> ${row[k] || 0}</div>`).join('');
            Utils.showTooltip(event, `<strong>${row.date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short'
            })}</strong><br/>${lines}<div style="margin-top:6px;"><strong>Total:</strong> ${total}</div>`);
        }).on('mouseout', Utils.hideTooltip);

        // labels
        g.append('text').attr('x', w / 2).attr('y', h + 40).attr('text-anchor', 'middle').style('font-weight', 600).text('Month');
        g.append('text').attr('transform', 'rotate(-90)').attr('x', -h / 2).attr('y', -45).attr('text-anchor', 'middle').style('font-weight', 600).text('Incidents');
    },
    updateTrendChart() {
        const data = STATE.view.incidents;
        const svg = d3.select('#' + DOM.trend);
        svg.selectAll('*').remove();
        const container = document.getElementById(DOM.trend);
        if (!container) return;
        const containerWidth = container.clientWidth || 900;

        const margin = {top: 30, right: 30, bottom: 60, left: 70};
        const width = containerWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const monthly = d3.rollup(data, v => v.length, d => d3.timeMonth(d.date));
        const aggregated = Array.from(monthly, ([date, count]) => ({date, count})).sort((a, b) => a.date - b.date);

        if (aggregated.length === 0) {
            g.append('text').attr('x', width / 2).attr('y', height / 2).attr('text-anchor', 'middle')
                .style('font-size', '16px').style('fill', '#6c757d').text('No data available for selected filters');
            return;
        }

        const x = d3.scaleTime().domain(d3.extent(aggregated, d => d.date)).range([0, width]);
        const y = d3.scaleLinear().domain([0, d3.max(aggregated, d => d.count)]).nice().range([height, 0]);

        g.append('g').attr('class', 'grid').attr('opacity', 0.1).call(d3.axisLeft(y).tickSize(-width).tickFormat(''));
        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(8))
            .selectAll('text').style('font-size', '12px');
        g.append('g').attr('class', 'axis').call(d3.axisLeft(y)).selectAll('text').style('font-size', '12px');

        const area = d3.area().x(d => x(d.date)).y0(height).y1(d => y(d.count)).curve(d3.curveMonotoneX);
        const line = d3.line().x(d => x(d.date)).y(d => y(d.count)).curve(d3.curveMonotoneX);

        g.append('path').datum(aggregated).attr('class', 'line-area').attr('d', area);
        g.append('path').datum(aggregated).attr('class', 'line').attr('d', line);

        g.append('text').attr('x', width / 2).attr('y', height + 50).attr('text-anchor', 'middle')
            .style('font-size', '14px').style('font-weight', '600').text('Month');
        g.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -50).attr('text-anchor', 'middle')
            .style('font-size', '14px').style('font-weight', '600').text('Number of Incidents');
    },
    updateDistributionChart() {
        const data = STATE.view.incidents;
        const svg = d3.select('#' + DOM.dist);
        svg.selectAll('*').remove();
        const container = document.getElementById(DOM.dist);
        if (!container) return;
        const containerWidth = container.clientWidth || 900;

        const margin = {top: 30, right: 30, bottom: 120, left: 70};
        const width = containerWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const byCat = d3.rollup(data, v => v.length, d => d.category);
        const aggregated = Array.from(byCat, ([category, count]) => ({category, count}))
            .sort((a, b) => b.count - a.count);

        if (aggregated.length === 0) {
            g.append('text').attr('x', width / 2).attr('y', height / 2).attr('text-anchor', 'middle')
                .style('font-size', '16px').style('fill', '#6c757d').text('No data available');
            return;
        }

        const x = d3.scaleBand().domain(aggregated.map(d => d.category)).range([0, width]).padding(0.3);
        const y = d3.scaleLinear().domain([0, d3.max(aggregated, d => d.count)]).nice().range([height, 0]);

        g.append('g').attr('class', 'grid').attr('opacity', 0.1).call(d3.axisLeft(y).tickSize(-width).tickFormat(''));
        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x))
            .selectAll('text').attr('transform', 'rotate(-45)').style('text-anchor', 'end').style('font-size', '12px')
            .attr('dx', '-0.5em').attr('dy', '0.5em');
        g.append('g').attr('class', 'axis').call(d3.axisLeft(y));

        g.selectAll('.bar').data(aggregated).enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.category))
            .attr('y', d => y(d.count))
            .attr('width', d => x.bandwidth())
            .attr('height', d => height - y(d.count))
            .attr('fill', d => Utils.getCrimeColor(d.category));

        g.selectAll('.bar-label').data(aggregated).enter().append('text')
            .attr('class', 'bar-label')
            .attr('x', d => x(d.category) + x.bandwidth() / 2)
            .attr('y', d => y(d.count) - 5)
            .attr('text-anchor', 'middle').style('font-size', '11px')
            .text(d => d.count);

        g.append('text').attr('x', width / 2).attr('y', height + 80).attr('text-anchor', 'middle')
            .style('font-size', '14px').style('font-weight', '600').text('Crime Category');
        g.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -50).attr('text-anchor', 'middle')
            .style('font-size', '14px').style('font-weight', '600').text('Number of Incidents');
    }
};
/** UI WIRING / BOOTSTRAP */
function wireControls() {
    const startInput = document.getElementById(DOM.start);
    const endInput = document.getElementById(DOM.end);
    const typeSelect = document.getElementById(DOM.type);
    const zipSelect = document.getElementById(DOM.zip);
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

    if (zipSelect) zipSelect.addEventListener('change', () => {
        STATE.filters.zipCode = zipSelect.value || 'all';
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
        if (zipSelect) zipSelect.value = 'all';
        DataManager.applyFilters();
    });
}
// Crime-type guide (auto from CONFIG)
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
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // assert critical DOM
        [DOM.map, DOM.legend, DOM.trend, DOM.dist, DOM.treemap, DOM.crimeGuide].forEach(Utils.assertEl);
        renderCrimeTypeGuide();
        Visualizations.initMap();
        wireControls();
        await DataManager.loadAll();
    } catch (e) {
        console.error(e);
        alert(e.message);
    }
});