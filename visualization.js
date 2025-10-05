/* ==========================================================================
   Crime Lens of Charlotte
   D3.js Visualization
   ========================================================================== */

// CONFIGURATION & CONSTANTS
const CONFIG = {
    // API Endpoints
    apis: {
        incidents: 'https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query?outFields=*&where=1%3D1&f=geojson',
        zipCodes: 'https://meckgis.mecklenburgcountync.gov/server/rest/services/ZipCodeBoundaries/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
        homicides: 'https://gis.charlottenc.gov/arcgis/rest/services/ODP/CMPD_Homicide/MapServer/0/query?outFields=*&where=1%3D1&f=geojson',
        violentCrime: 'https://gis.charlottenc.gov/arcgis/rest/services/ODP/ViolentCrimeData/MapServer/0/query?outFields=*&where=1%3D1&f=json'
    },

    // Charlotte Brand Colors
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

    // Crime Type Categories - Based on NIBRS descriptions
    crimeCategories: {
        violent: ['Murder', 'Aggravated Assault', 'Simple Assault', 'Intimidation', 'Kidnapping', 'Robbery', 'Affray', 'Negligent Manslaughter', 'Justifiable Homicide'],
        sex: ['Forcible Rape', 'Forcible Sodomy', 'Sexual Assault With Object', 'Forcible Fondling', 'Statutory Rape', 'Incest', 'Indecent Exposure', 'Pornography/Obscene Material', 'Prostitution', 'Purchasing Prostitution', 'Assisting Prostitution', 'Human Trafficking, Commercial Sex Acts', 'Human Trafficking, Involuntary Servitude', 'Peeping Tom'],
        property: ['Burglary/B&E', 'Arson', 'Damage/Vandalism Of Property', 'Theft From Building', 'Theft From Motor Vehicle', 'Theft of Motor Vehicle Parts from Vehicle', 'Motor Vehicle Theft', 'Purse-Snatching', 'Pocket-Picking', 'Shoplifting', 'All Other Thefts', 'Theft From Coin-Operated Machine Or Device', 'Stolen Property Offenses'],
        fraud: ['Embezzlement', 'False Pretenses/Swindle', 'Credit Card/Teller Fraud', 'Identity Theft', 'Counterfeiting/Forgery', 'Wire Fraud', 'Hacking/Computer Invasion', 'Welfare Fraud', 'Worthless Check: Felony (over $2000)', 'Bribery', 'Extortion/Blackmail'],
        drug: ['Drug/Narcotic Violations', 'Drug Equipment Violations', 'Liquor Law Violations', 'Driving Under The Influence', 'Overdose'],
        publicOrder: ['Disorderly Conduct', 'Trespass Of Real Property', 'Curfew/Loitering/Vagrancy Violations', 'Gambling Equipment Violations', 'Assisting Gambling', 'Betting/Wagering', 'Family Offenses; Nonviolent'],
        weapons: ['Weapon Law Violations'],
        other: ['All Other Offenses', 'Other Unlisted Non-Criminal', 'Missing Person', 'Suicide', 'Sudden/Natural Death Investigation', 'Public Accident', 'Fire (Accidental/Non-Arson)', 'Gas Leak', 'Vehicle Recovery', 'Animal Cruelty', 'Dog Bite/Animal Control Incident']
    },

    // Map settings
    map: {
        width: 1000, height: 600, centerLat: 35.2271, centerLon: -80.8431
    }
};

// GLOBAL STATE
const STATE = {
    rawData: {
        incidents: null,
        zipCodes: null,
        homicides: null,
        violentCrime: null
    },
    processedData: {
        incidents: [],
        zipCodes: [],
        homicides: [],
        violentCrime: [],
        filtered: [],
        filteredHomicides: [],
        filteredViolent: []
    },
    filters: {
        startDate: null,
        endDate: null,
        crimeTypes: ['all'],
        zipCode: 'all'
    },
    maps: {
        incidents: null,
        homicides: null,
        violent: null
    },
    layers: {
        incidents: {zipBoundaries: null, crimePoints: null},
        homicides: {zipBoundaries: null, crimePoints: null},
        violent: {zipBoundaries: null, crimePoints: null}
    }
};

// UTILITY FUNCTIONS
const Utils = {
    // Show/hide loading overlay
    setLoading(isLoading) {
        const overlay = document.getElementById('loadingOverlay');
        if (isLoading) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
        STATE.isLoading = isLoading;
    },

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    },

    // Parse date from various formats
    parseDate(dateString) {
        if (!dateString) return null;
        // Handle timestamp (milliseconds)
        if (typeof dateString === 'number') {
            return new Date(dateString);
        }
        return new Date(dateString);
    },

    // Categorize crime type
    categorizeCrime(description) {
        if (!description) return 'other';

        const desc = description.toUpperCase();

        for (const [category, keywords] of Object.entries(CONFIG.crimeCategories)) {
            // Check if any keyword matches (case-insensitive partial match)
            for (const keyword of keywords) {
                if (desc.includes(keyword.toUpperCase())) {
                    return category;
                }
            }
        }

        return 'other';
    },

    // Get color for crime category
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

    // Show tooltip
    showTooltip(event, content) {
        const tooltip = d3.select('#tooltip');
        tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .attr('aria-hidden', 'false')
            .html(content);
    },

    // Hide tooltip
    hideTooltip() {
        d3.select('#tooltip').attr('aria-hidden', 'true');
    },

    // Format number with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
};

// DATA LOADING & PROCESSING
const DataManager = {
    // Load all datasets
    async loadAllData() {
        Utils.setLoading(true);

        try {
            console.log('Loading crime data...');

            // Load ZIP codes first (smaller dataset)
            console.log('Fetching ZIP codes from:', CONFIG.apis.zipCodes);
            const zipResponse = await fetch(CONFIG.apis.zipCodes);

            if (!zipResponse.ok) {
                throw new Error(`ZIP codes API error: ${zipResponse.status}`);
            }

            STATE.rawData.zipCodes = await zipResponse.json();
            console.log('ZIP codes loaded:', STATE.rawData.zipCodes.features?.length || 0);

            // Load incidents
            console.log('Fetching incidents from:', CONFIG.apis.incidents);
            const incidentsResponse = await fetch(CONFIG.apis.incidents);

            if (!incidentsResponse.ok) {
                throw new Error(`Incidents API error: ${incidentsResponse.status}`);
            }

            STATE.rawData.incidents = await incidentsResponse.json();
            console.log('Incidents loaded:', STATE.rawData.incidents.features?.length || 0);

            // Load homicides
            console.log('Fetching homicides from:', CONFIG.apis.homicides);
            const homicidesResponse = await fetch(CONFIG.apis.homicides);

            if (!homicidesResponse.ok) {
                throw new Error(`Homicides API error: ${homicidesResponse.status}`);
            }

            STATE.rawData.homicides = await homicidesResponse.json();
            console.log('Homicides loaded:', STATE.rawData.homicides.features?.length || 0);

            // Load violent crimes
            console.log('Fetching violent crimes from:', CONFIG.apis.violentCrime);
            const violentResponse = await fetch(CONFIG.apis.violentCrime);

            if (!violentResponse.ok) {
                throw new Error(`Violent crimes API error: ${violentResponse.status}`);
            }

            STATE.rawData.violentCrime = await violentResponse.json();
            console.log('Violent crimes loaded:', STATE.rawData.violentCrime.features?.length || 0);

            // Process the data
            this.processData();

            Utils.setLoading(false);
            return true;

        } catch (error) {
            console.error('Error loading data:', error);
            Utils.setLoading(false);
            alert(`Error loading data: ${error.message}\n\nPlease check the console for details.`);
            return false;
        }
    },

    // Process raw data into usable format
    processData() {
        console.log('Processing data...');

        // Function to check if a coordinate is reasonable
        const isValidCoordinate = (lon, lat) => {
            return lon >= -180 && lon <= -70 && lat >= 25 && lat <= 50;
        };

        // Process ZIP codes
        let validCount = 0;
        let invalidCount = 0;

        STATE.processedData.zipCodes = STATE.rawData.zipCodes.features
            .map((feature) => {
                const props = feature.properties;
                const geom = feature.geometry;

                if (!geom || !geom.coordinates || geom.coordinates.length === 0) {
                    invalidCount++;
                    return null;
                }

                let firstCoord;
                if (geom.type === 'Polygon') {
                    firstCoord = geom.coordinates[0][0];
                } else if (geom.type === 'MultiPolygon') {
                    firstCoord = geom.coordinates[0][0][0];
                } else {
                    invalidCount++;
                    return null;
                }

                if (!firstCoord || !isValidCoordinate(firstCoord[0], firstCoord[1])) {
                    invalidCount++;
                    return null;
                }

                validCount++;

                const zipCode = props.ZIPCODE || props.ZIP || props.zip || props.ZIPCODE5 || props.ZIP5 || props.zip5 || props.GEOID || props.geoid || props.NAME || props.name;

                return {
                    type: 'Feature',
                    geometry: feature.geometry,
                    properties: {
                        zipCode: zipCode,
                        name: zipCode,
                        ...props
                    }
                };
            })
            .filter(feature => feature !== null && feature.properties.zipCode);

        console.log(`Processed ${validCount} valid ZIP codes, rejected ${invalidCount} invalid`);

        // Process incidents
        STATE.processedData.incidents = STATE.rawData.incidents.features.map(feature => {
            const props = feature.properties;
            const coords = feature.geometry?.coordinates || [];
            const dateValue = props.date || props.DATE || props.date_reported || props.DATE_REPORTED || props.datetime || props.DATETIME;

            return {
                id: props.OBJECTID || props.objectid || Math.random(),
                date: Utils.parseDate(dateValue),
                type: props.highest_nibrs_description || props.HIGHEST_NIBRS_DESCRIPTION || props.offense_description || props.OFFENSE_DESCRIPTION || 'Unknown',
                category: Utils.categorizeCrime(props.highest_nibrs_description || props.HIGHEST_NIBRS_DESCRIPTION || props.offense_description || props.OFFENSE_DESCRIPTION || ''),
                latitude: coords[1],
                longitude: coords[0],
                address: props.address || props.ADDRESS || '',
                zipCode: props.zip || props.ZIP || props.zipcode || null,
                nibrsCode: props.highest_nibrs_code || props.HIGHEST_NIBRS_CODE || null
            };
        }).filter(incident =>
            incident.latitude && incident.longitude && !isNaN(incident.latitude) && !isNaN(incident.longitude) && incident.date instanceof Date && !isNaN(incident.date));

        console.log('Performing spatial join for incidents...');
        STATE.processedData.incidents = this.spatialJoinToZipCodes(STATE.processedData.incidents);
        console.log('Processed incidents:', STATE.processedData.incidents.length);

        // Process homicides
        // Process homicides - REPLACE THIS SECTION
        STATE.processedData.homicides = STATE.rawData.homicides.features.map(feature => {
            const props = feature.properties;
            const coords = feature.geometry?.coordinates || [];
            const dateValue = props.DATE_REPORTED || props.date || props.DATE || props.date_reported || props.datetime || props.DATETIME;

            return {
                id: props.OBJECTID || props.objectid || Math.random(),
                date: Utils.parseDate(dateValue),
                type: props.highest_nibrs_description || props.HIGHEST_NIBRS_DESCRIPTION || 'Homicide',
                category: 'violent',
                latitude: coords[1],
                longitude: coords[0],
                address: props.LOCATION || props.address || props.ADDRESS || '',
                zipCode: props.zip || props.ZIP || props.zipcode || null,
                nibrsCode: props.highest_nibrs_code || props.HIGHEST_NIBRS_CODE || null,
                // NEW: Extract additional properties for treemap
                division: props.CMPD_PATROL_DIVISION || 'Unknown',
                weapon: props.WEAPON || 'Unknown',
                clearanceStatus: props.CLEARANCE_STATUS || 'Unknown',
                circumstances: props.CIRCUMSTANCES || 'Unknown',
                age: props.AGE,
                gender: props.GENDER,
                race: props.RACE_ETHNICITY
            };
        }).filter(incident =>
            incident.latitude && incident.longitude && !isNaN(incident.latitude) && !isNaN(incident.longitude) && incident.date instanceof Date && !isNaN(incident.date));

        console.log('Performing spatial join for homicides...');
        STATE.processedData.homicides = this.spatialJoinToZipCodes(STATE.processedData.homicides);
        console.log('Processed homicides:', STATE.processedData.homicides.length);

        // Process violent crimes (note: this API returns JSON, not GeoJSON)
        STATE.processedData.violentCrime = (STATE.rawData.violentCrime.features || []).map(feature => {
            const props = feature.attributes || feature.properties;
            const geom = feature.geometry;
            const dateValue = props.date || props.DATE || props.date_reported || props.DATE_REPORTED;

            return {
                id: props.OBJECTID || props.objectid || Math.random(),
                date: Utils.parseDate(dateValue),
                type: props.highest_nibrs_description || props.HIGHEST_NIBRS_DESCRIPTION || 'Violent Crime',
                category: 'violent',
                latitude: geom?.y || geom?.coordinates?.[1],
                longitude: geom?.x || geom?.coordinates?.[0],
                address: props.address || props.ADDRESS || '',
                zipCode: props.zip || props.ZIP || props.zipcode || null,
                nibrsCode: props.highest_nibrs_code || props.HIGHEST_NIBRS_CODE || null
            };
        }).filter(incident =>
            incident.latitude && incident.longitude && !isNaN(incident.latitude) && !isNaN(incident.longitude) && incident.date instanceof Date && !isNaN(incident.date));

        console.log('Performing spatial join for violent crimes...');
        STATE.processedData.violentCrime = this.spatialJoinToZipCodes(STATE.processedData.violentCrime);
        console.log('Processed violent crimes:', STATE.processedData.violentCrime.length);

        // Set default date range from incidents
        const dates = STATE.processedData.incidents.map(d => d.date);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        STATE.filters.startDate = minDate;
        STATE.filters.endDate = maxDate;

        // Set date inputs
        document.getElementById('startDate').value = minDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = maxDate.toISOString().split('T')[0];

        // Add min/max constraints to prevent selecting dates outside data range
        document.getElementById('startDate').setAttribute('min', minDate.toISOString().split('T')[0]);
        document.getElementById('startDate').setAttribute('max', maxDate.toISOString().split('T')[0]);
        document.getElementById('endDate').setAttribute('min', minDate.toISOString().split('T')[0]);
        document.getElementById('endDate').setAttribute('max', maxDate.toISOString().split('T')[0]);

        // Populate ZIP code dropdown
        this.populateZipCodeDropdown();

        // Apply initial filter
        this.applyFilters();
    },

    // Populate ZIP code dropdown
    populateZipCodeDropdown() {
        const select = document.getElementById('zipCode');

        const zipCodes = STATE.processedData.zipCodes
            .map(feature => feature.properties.zipCode)
            .filter(zip => zip && zip.length === 5)
            .sort((a, b) => a.localeCompare(b));

        const uniqueZips = [...new Set(zipCodes)];

        console.log('Populating ZIP dropdown with', uniqueZips.length, 'unique ZIP codes');

        uniqueZips.forEach(zip => {
            const option = document.createElement('option');
            option.value = zip;
            option.textContent = zip;
            select.appendChild(option);
        });
    },

    // Spatially join incidents to ZIP codes using point-in-polygon
    spatialJoinToZipCodes(incidents) {
        let matched = 0;
        let unmatched = 0;

        incidents.forEach(incident => {
            for (const zipFeature of STATE.processedData.zipCodes) {
                const point = [incident.longitude, incident.latitude];

                if (this.pointInPolygon(point, zipFeature.geometry)) {
                    incident.zipCode = zipFeature.properties.zipCode;
                    matched++;
                    break;
                }
            }

            if (!incident.zipCode) {
                unmatched++;
            }
        });

        console.log(`Spatial join complete: ${matched} matched, ${unmatched} unmatched`);
        return incidents;
    },

    // Check if a point is inside a polygon
    pointInPolygon(point, geometry) {
        const [x, y] = point;

        if (geometry.type === 'Polygon') {
            return this.pointInRing(x, y, geometry.coordinates[0]);
        } else if (geometry.type === 'MultiPolygon') {
            for (const polygon of geometry.coordinates) {
                if (this.pointInRing(x, y, polygon[0])) {
                    return true;
                }
            }
        }

        return false;
    },

    // Ray casting algorithm for point-in-polygon
    pointInRing(x, y, ring) {
        let inside = false;

        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];

            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    },

    // Apply filters to data
    applyFilters() {
        // Filter incidents
        let filtered = STATE.processedData.incidents;

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

        STATE.processedData.filtered = filtered;

        // Filter homicides
        let filteredHomicides = STATE.processedData.homicides;

        if (STATE.filters.startDate) {
            filteredHomicides = filteredHomicides.filter(d => d.date >= STATE.filters.startDate);
        }
        if (STATE.filters.endDate) {
            filteredHomicides = filteredHomicides.filter(d => d.date <= STATE.filters.endDate);
        }
        if (STATE.filters.zipCode !== 'all') {
            filteredHomicides = filteredHomicides.filter(d => d.zipCode === STATE.filters.zipCode);
        }

        STATE.processedData.filteredHomicides = filteredHomicides;

        // Filter violent crimes
        let filteredViolent = STATE.processedData.violentCrime;

        if (STATE.filters.startDate) {
            filteredViolent = filteredViolent.filter(d => d.date >= STATE.filters.startDate);
        }
        if (STATE.filters.endDate) {
            filteredViolent = filteredViolent.filter(d => d.date <= STATE.filters.endDate);
        }
        if (STATE.filters.zipCode !== 'all') {
            filteredViolent = filteredViolent.filter(d => d.zipCode === STATE.filters.zipCode);
        }

        STATE.processedData.filteredViolent = filteredViolent;

        console.log('Filtered incidents:', filtered.length);
        console.log('Filtered homicides:', filteredHomicides.length);
        console.log('Filtered violent crimes:', filteredViolent.length);

        // Update all visualizations
        Visualizations.updateAll();
    }
};

// VISUALIZATIONS
const Visualizations = {
    // Initialize all three Leaflet maps
    initMaps() {
        // Incidents Map only
        if (STATE.maps.incidents) {
            STATE.maps.incidents.remove();
        }

        const incidentsEl = document.getElementById('mapVisualization');
        if (!incidentsEl) {
            console.warn('#mapVisualization not found; skipping incidents Leaflet init');
            return;
        }

        STATE.maps.incidents = L.map(incidentsEl, {
            center: [35.2271, -80.8431],
            zoom: 11,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
            minZoom: 10
        }).addTo(STATE.maps.incidents);

        STATE.layers.incidents.zipBoundaries = L.layerGroup().addTo(STATE.maps.incidents);
        STATE.layers.incidents.crimePoints = L.layerGroup().addTo(STATE.maps.incidents);

        console.log('Leaflet incidents map initialized');

        // Force map to render properly after layout
        setTimeout(() => {
            STATE.maps.incidents.invalidateSize();
        }, 100);
    },
    updateViolentStackedArea() {
        const data = STATE.processedData.filteredViolent;

        const root = d3.select('#violentStackedArea');
        root.selectAll('*').remove(); // clear prior render

        if (!root.node()) {
            console.warn('#violentStackedArea not found');
            return;
        }

        if (!data || data.length === 0) {
            root.append('div')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'center')
                .style('height', '100%')
                .style('color', '#6c757d')
                .style('font-size', '16px')
                .text('No violent-crime data for selected filters');
            return;
        }

        // ---- Dimensions
        const container = root.node();
        const width = container.clientWidth || 900;
        const height = 600;
        const margin = {top: 30, right: 160, bottom: 50, left: 60};
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const svg = root.append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // ---- Aggregate by month and type (violent offenses only)
        const monthKey = d => d3.timeMonth(d.date);
        const byMonthType = d3.rollup(
            data,
            v => v.length,
            d => monthKey(d),
            d => (d.type || 'Unknown')
        );

        const months = Array.from(byMonthType.keys()).sort(d3.ascending);
        const typeTotals = d3.rollup(data, v => v.length, d => (d.type || 'Unknown'));
        const sortedTypes = Array.from(typeTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .map(d => d[0]);

        const TOP_K = Math.min(6, sortedTypes.length);
        const topKeys = sortedTypes.slice(0, TOP_K);
        const keys = topKeys.concat(sortedTypes.slice(TOP_K).length ? ['Other'] : []);

        // Build rows for stack: {date, key1, key2, ..., Other}
        const rows = months.map(m => {
            const row = {date: m};
            let monthTotal = 0;

            topKeys.forEach(k => {
                const v = byMonthType.get(m)?.get(k) ?? 0;
                row[k] = v;
                monthTotal += v;
            });

            if (keys.includes('Other')) {
                // total across all types in this month
                const thisMonthMap = byMonthType.get(m) || new Map();
                const total = Array.from(thisMonthMap.values()).reduce((a, b) => a + b, 0);
                row['Other'] = Math.max(0, total - monthTotal);
            }

            return row;
        });

        // ---- Scales
        const x = d3.scaleTime()
            .domain(d3.extent(months))
            .range([0, w]);

        const stack = d3.stack().keys(keys).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
        const series = stack(rows);

        const y = d3.scaleLinear()
            .domain([0, d3.max(series, s => d3.max(s, d => d[1]))]).nice()
            .range([h, 0]);

        const color = d3.scaleOrdinal()
            .domain(keys)
            .range(d3.schemeTableau10.concat(['#999999']).slice(0, keys.length));

        // ---- Axes + grid
        g.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisLeft(y).tickSize(-w).tickFormat(''));

        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).ticks(8));

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));

        // ---- Area layers
        const area = d3.area()
            .x(d => x(d.data.date))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveMonotoneX);

        g.selectAll('.area-layer')
            .data(series)
            .enter()
            .append('path')
            .attr('class', 'area-layer')
            .attr('d', area)
            .attr('fill', d => color(d.key))
            .attr('opacity', 0.8);

        // ---- Legend (chart-specific; not the Leaflet map legend)
        const legend = svg.append('g')
            .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`)
            .attr('class', 'stacked-legend');

        const legendItem = legend.selectAll('g')
            .data(keys)
            .enter()
            .append('g')
            .attr('transform', (d, i) => `translate(0, ${i * 22})`);

        legendItem.append('rect')
            .attr('width', 14)
            .attr('height', 14)
            .attr('rx', 3)
            .attr('ry', 3)
            .attr('fill', d => color(d));

        legendItem.append('text')
            .attr('x', 20)
            .attr('y', 11)
            .style('font-size', '12px')
            .text(d => d);

        // ---- Tooltip
        const overlay = g.append('rect')
            .attr('fill', 'transparent')
            .attr('pointer-events', 'all')
            .attr('width', w)
            .attr('height', h);

        const bisect = d3.bisector(d => d.date).center;

        overlay
            .on('mousemove', (event) => {
                const xm = d3.pointer(event, overlay.node())[0];
                const date = x.invert(xm);
                const idx = bisect(rows, date);
                const row = rows[Math.max(0, Math.min(rows.length - 1, idx))];

                // Build tooltip content
                const total = keys.reduce((acc, k) => acc + (row[k] || 0), 0);
                const lines = keys.map(k => `<div><strong>${k}:</strong> ${row[k] || 0}</div>`).join('');
                Utils.showTooltip(event, `
                <strong>${row.date.toLocaleDateString('en-US', {year: 'numeric', month: 'short'})}</strong><br/>
                ${lines}
                <div style="margin-top:6px;"><strong>Total:</strong> ${total}</div>
            `);
            })
            .on('mouseout', Utils.hideTooltip);

        // ---- Axis labels
        g.append('text')
            .attr('x', w / 2)
            .attr('y', h + 40)
            .attr('text-anchor', 'middle')
            .style('font-weight', 600)
            .text('Month');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -h / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .style('font-weight', 600)
            .text('Incidents');
    },
    // Update all visualizations
    updateAll() {
        this.updateIncidentsMap();
        this.updateHomicidesMap();
        this.updateViolentStackedArea();
        this.updateTrendChart();
        this.updateDistributionChart();
    },

    // Update Incidents Map
    updateIncidentsMap() {
        const data = STATE.processedData.filtered;
        const zipCodes = STATE.processedData.zipCodes;
        const map = STATE.maps.incidents;
        const layers = STATE.layers.incidents;

        this.renderMap(map, layers, data, zipCodes, 'mapLegend');
    },

    // Update Homicides Map
    // Update Homicides Treemap - REPLACE ENTIRE FUNCTION
    updateHomicidesMap() {
        const data = STATE.processedData.filteredHomicides;

        // Clear existing
        d3.select('#homicidesTreemap').selectAll('*').remove();

        if (data.length === 0) {
            d3.select('#homicidesTreemap')
                .append('div')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'center')
                .style('height', '100%')
                .style('color', '#6c757d')
                .style('font-size', '16px')
                .text('No homicide data available for selected filters');
            return;
        }

        // Build hierarchy: Division → Weapon (2 levels only)
        const nested = d3.group(data,
            d => d.division,
            d => d.weapon
        );

        // Convert to hierarchical structure
        const hierarchyData = {
            name: 'Homicides',
            children: Array.from(nested, ([division, weapons]) => ({
                name: division,
                children: Array.from(weapons, ([weapon, items]) => ({
                    name: weapon,
                    value: items.length,
                    data: items
                }))
            }))
        };

        const container = document.getElementById('homicidesTreemap');
        const width = container.clientWidth;
        const height = 600;

        const svg = d3.select('#homicidesTreemap')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Create hierarchy
        const root = d3.hierarchy(hierarchyData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        // Create treemap layout with more padding
        d3.treemap()
            .size([width, height])
            .padding(3)
            .round(true)
            (root);

        // Color scale for divisions
        const divisions = Array.from(new Set(data.map(d => d.division)));
        const colorScale = d3.scaleOrdinal()
            .domain(divisions)
            .range([
                CONFIG.colors.red,
                CONFIG.colors.darkRed,
                CONFIG.colors.orange,
                CONFIG.colors.purple,
                CONFIG.colors.medBlue,
                CONFIG.colors.blue,
                CONFIG.colors.legacyGreen,
                CONFIG.colors.darkGreen,
                '#8B4513', // Brown
                '#FF6B6B', // Light red
                '#4ECDC4', // Teal
                '#95E1D3'  // Mint
            ]);

        // Create cells
        const cell = svg.selectAll('g')
            .data(root.leaves())
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);

        // Add rectangles
        cell.append('rect')
            .attr('class', 'treemap-cell')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', d => {
                // Get division (parent)
                const division = d.parent.data.name;
                return colorScale(division);
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', function (event, d) {
                const division = d.parent.data.name;
                const weapon = d.data.name;
                const count = d.value;
                const percentage = ((count / data.length) * 100).toFixed(1);

                Utils.showTooltip(event, `
                <strong>${division}</strong><br/>
                Weapon: ${weapon}<br/>
                Count: ${count} (${percentage}%)
            `);
            })
            .on('mouseout', Utils.hideTooltip);

        // Add weapon labels
        cell.append('text')
            .attr('class', 'treemap-label')
            .attr('x', d => (d.x1 - d.x0) / 2)
            .attr('y', d => (d.y1 - d.y0) / 2 - 8)
            .text(d => {
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                // Only show label if cell is large enough
                if (width > 80 && height > 50) {
                    const weapon = d.data.name;
                    // Truncate long weapon names
                    return weapon.length > 15 ? weapon.substring(0, 12) + '...' : weapon;
                }
                return '';
            });

        // Add count
        cell.append('text')
            .attr('class', 'treemap-sublabel')
            .attr('x', d => (d.x1 - d.x0) / 2)
            .attr('y', d => (d.y1 - d.y0) / 2 + 8)
            .text(d => {
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                if (width > 50 && height > 40) {
                    return d.value;
                }
                return '';
            });

        // Add division name (smaller)
        cell.append('text')
            .attr('class', 'treemap-sublabel')
            .style('font-size', '9px')
            .style('opacity', '0.8')
            .attr('x', d => (d.x1 - d.x0) / 2)
            .attr('y', d => (d.y1 - d.y0) / 2 + 22)
            .text(d => {
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                if (width > 80 && height > 60) {
                    const division = d.parent.data.name;
                    return division.length > 12 ? division.substring(0, 10) + '...' : division;
                }
                return '';
            });
    },

    // Generalized map rendering function
    renderMap(map, layers, data, zipCodes, legendId) {
        console.log('Rendering map with', data.length, 'crimes');

        // Clear existing layers
        map.eachLayer(function (layer) {
            if (layer instanceof L.TileLayer) {
                return;
            }
            map.removeLayer(layer);
        });

        if (layers.zipBoundaries) {
            layers.zipBoundaries.clearLayers();
        }
        if (layers.crimePoints) {
            layers.crimePoints.clearLayers();
        }

        if (!map) {
            console.error('Map not initialized');
            return;
        }

        // Add ZIP code boundaries
        if (zipCodes && zipCodes.length > 0) {
            zipCodes.forEach(zipFeature => {
                const zipCode = zipFeature.properties.zipCode;
                const crimeCount = data.filter(crime => crime.zipCode === zipCode).length;

                const style = {
                    fillColor: '#e0e0e0',
                    weight: 2,
                    opacity: 1,
                    color: '#24B24A',
                    fillOpacity: 0.3
                };

                const layer = L.geoJSON(zipFeature, {
                    style: style,
                    onEachFeature: (feature, layer) => {
                        layer.on({
                            mouseover: (e) => {
                                e.target.setStyle({
                                    fillColor: '#71BF44',
                                    fillOpacity: 0.7
                                });
                            },
                            mouseout: (e) => {
                                e.target.setStyle(style);
                            }
                        });

                        layer.bindPopup(`
                            <strong>ZIP Code: ${zipCode}</strong><br/>
                            Incidents: ${crimeCount}
                        `);
                    }
                });

                if (layers.zipBoundaries) {
                    layers.zipBoundaries.addLayer(layer);
                }
            });
        }

        // Add crime points
        console.log('Adding', data.length, 'crime points to map');

        data.forEach((crime) => {
            if (!crime.latitude || !crime.longitude) {
                return;
            }

            const color = Utils.getCrimeColor(crime.category);

            const icon = L.divIcon({
                className: 'crime-marker',
                html: `<div style="background-color: ${color}; width: 8px; height: 8px; border-radius: 50%; border: 1px solid white;"></div>`,
                iconSize: [8, 8]
            });

            const marker = L.marker([crime.latitude, crime.longitude], {
                icon: icon
            });

            marker.bindPopup(`
                <strong>${crime.type}</strong><br/>
                Date: ${Utils.formatDate(crime.date)}<br/>
                Category: ${crime.category}<br/>
                ${crime.address ? 'Location: ' + crime.address : ''}
            `);

            marker.addTo(map);
        });

        // Update legend
        this.updateMapLegend(legendId);
    },

    // Update map legend
    updateMapLegend(legendId) {
        const legend = d3.select(`#${legendId}`);
        legend.selectAll('*').remove();

        const categories = [
            {name: 'Violent Crimes', color: CONFIG.colors.red},
            {name: 'Sex Crimes', color: CONFIG.colors.purple},
            {name: 'Property Crimes', color: CONFIG.colors.orange},
            {name: 'Fraud / Financial', color: CONFIG.colors.yellow},
            {name: 'Drug & Alcohol', color: CONFIG.colors.medBlue},
            {name: 'Public Order', color: CONFIG.colors.legacyGreen},
            {name: 'Weapons', color: CONFIG.colors.darkRed},
            {name: 'Other', color: CONFIG.colors.blue}
        ];

        categories.forEach(cat => {
            const item = legend.append('div').attr('class', 'legend-item');
            item.append('div')
                .attr('class', 'legend-color')
                .style('background-color', cat.color);
            item.append('span')
                .attr('class', 'legend-label')
                .text(cat.name);
        });
    },

    // Create/update trend chart
    updateTrendChart() {
        const data = STATE.processedData.filtered;

        d3.select('#trendVisualization').selectAll('*').remove();

        const svg = d3.select('#trendVisualization');
        const container = document.getElementById('trendVisualization');
        const containerWidth = container.clientWidth;

        const margin = {top: 30, right: 30, bottom: 60, left: 70};
        const width = containerWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const monthlyData = d3.rollup(data, v => v.length, d => d3.timeMonth(d.date));

        const aggregated = Array.from(monthlyData, ([date, count]) => ({date, count}))
            .sort((a, b) => a.date - b.date);

        if (aggregated.length === 0) {
            g.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '16px')
                .style('fill', '#6c757d')
                .text('No data available for selected filters');
            return;
        }

        const x = d3.scaleTime()
            .domain(d3.extent(aggregated, d => d.date))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(aggregated, d => d.count)])
            .nice()
            .range([height, 0]);

        g.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(8))
            .selectAll('text')
            .style('font-size', '12px');

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y))
            .selectAll('text')
            .style('font-size', '12px');

        const area = d3.area()
            .x(d => x(d.date))
            .y0(height)
            .y1(d => y(d.count))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(aggregated)
            .attr('class', 'line-area')
            .attr('d', area);

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.count))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(aggregated)
            .attr('class', 'line')
            .attr('d', line);

        g.append('text')
            .attr('x', width / 2)
            .attr('y', height + 50)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .text('Month');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -50)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .text('Number of Incidents');
    },

    // Create/update distribution chart
    updateDistributionChart() {
        const data = STATE.processedData.filtered;

        d3.select('#distributionVisualization').selectAll('*').remove();

        const svg = d3.select('#distributionVisualization');
        const container = document.getElementById('distributionVisualization');
        const containerWidth = container.clientWidth;

        const margin = {top: 30, right: 30, bottom: 120, left: 70};
        const width = containerWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const categoryData = d3.rollup(data, v => v.length, d => d.category);

        const aggregated = Array.from(categoryData, ([category, count]) => ({
            category, count
        })).sort((a, b) => b.count - a.count);

        if (aggregated.length === 0) {
            g.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '16px')
                .style('fill', '#6c757d')
                .text('No data available');
            return;
        }

        const x = d3.scaleBand()
            .domain(aggregated.map(d => d.category))
            .range([0, width])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, d3.max(aggregated, d => d.count)])
            .nice()
            .range([height, 0]);

        g.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .style('font-size', '12px')
            .attr('dx', '-0.5em')
            .attr('dy', '0.5em');

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y))
            .selectAll('text')
            .style('font-size', '12px');

        g.selectAll('.bar')
            .data(aggregated)
            .enter()
            .append('rect')
            .attr('class', d => `bar ${d.category}`)
            .attr('x', d => x(d.category))
            .attr('y', d => y(d.count))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.count))
            .on('mouseover', function (event, d) {
                d3.select(this).style('opacity', 0.8);
                Utils.showTooltip(event, `
                <strong>${d.category.toUpperCase()}</strong><br/>
                Count: ${Utils.formatNumber(d.count)}<br/>
                Percentage: ${((d.count / data.length) * 100).toFixed(1)}%
            `);
            })
            .on('mouseout', function () {
                d3.select(this).style('opacity', 1);
                Utils.hideTooltip();
            });

        g.append('text')
            .attr('x', width / 2)
            .attr('y', height + 100)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .text('Crime Category');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -50)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .text('Number of Incidents');
    }
};

// EVENT HANDLERS
const EventHandlers = {
    init() {
        // Date filters
        document.getElementById('startDate').addEventListener('change', (e) => {
            STATE.filters.startDate = new Date(e.target.value);
            DataManager.applyFilters();
        });

        document.getElementById('endDate').addEventListener('change', (e) => {
            STATE.filters.endDate = new Date(e.target.value);
            DataManager.applyFilters();
        });

        // Crime type filter
        document.getElementById('crimeType').addEventListener('change', (e) => {
            const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
            STATE.filters.crimeTypes = selected.length > 0 ? selected : ['all'];
            DataManager.applyFilters();
        });

        // ZIP code filter
        document.getElementById('zipCode').addEventListener('change', (e) => {
            STATE.filters.zipCode = e.target.value;
            DataManager.applyFilters();
        });

        // Reset filters
        document.getElementById('resetFilters').addEventListener('click', () => {
            STATE.filters.crimeTypes = ['all'];
            STATE.filters.zipCode = 'all';

            const dates = STATE.processedData.incidents.map(d => d.date);
            STATE.filters.startDate = new Date(Math.min(...dates));
            STATE.filters.endDate = new Date(Math.max(...dates));

            document.getElementById('startDate').value = STATE.filters.startDate.toISOString().split('T')[0];
            document.getElementById('endDate').value = STATE.filters.endDate.toISOString().split('T')[0];
            document.getElementById('crimeType').selectedIndex = 0;
            document.getElementById('zipCode').selectedIndex = 0;

            DataManager.applyFilters();
        });
    }
};

// INITIALIZATION
async function init() {
    console.log('Initializing Charlotte Crime Dashboard...');

    // Initialize all three Leaflet maps
    Visualizations.initMaps();

    // Set up event handlers
    EventHandlers.init();

    // Load and process data
    const success = await DataManager.loadAllData();

    if (success) {
        console.log('Dashboard initialized successfully!');
    } else {
        console.error('Failed to initialize dashboard');
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}