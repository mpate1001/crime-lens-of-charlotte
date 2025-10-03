/* ==========================================================================
   Charlotte Crime Dashboard - D3.js Visualization
   Main JavaScript file for data loading, processing, and visualization
   ========================================================================== */

// ===========================================================================
// CONFIGURATION & CONSTANTS
// ===========================================================================

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
        lightGreen: '#7BF44',
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
        violent: [
            'Murder', 'Aggravated Assault', 'Simple Assault', 'Intimidation',
            'Kidnapping', 'Robbery', 'Affray', 'Negligent Manslaughter',
            'Justifiable Homicide'
        ],
        sex: [
            'Forcible Rape', 'Forcible Sodomy', 'Sexual Assault With Object',
            'Forcible Fondling', 'Statutory Rape', 'Incest', 'Indecent Exposure',
            'Pornography/Obscene Material', 'Prostitution', 'Purchasing Prostitution',
            'Assisting Prostitution', 'Human Trafficking, Commercial Sex Acts',
            'Human Trafficking, Involuntary Servitude', 'Peeping Tom'
        ],
        property: [
            'Burglary/B&E', 'Arson', 'Damage/Vandalism Of Property',
            'Theft From Building', 'Theft From Motor Vehicle',
            'Theft of Motor Vehicle Parts from Vehicle', 'Motor Vehicle Theft',
            'Purse-Snatching', 'Pocket-Picking', 'Shoplifting',
            'All Other Thefts', 'Theft From Coin-Operated Machine Or Device',
            'Stolen Property Offenses'
        ],
        fraud: [
            'Embezzlement', 'False Pretenses/Swindle', 'Credit Card/Teller Fraud',
            'Identity Theft', 'Counterfeiting/Forgery', 'Wire Fraud',
            'Hacking/Computer Invasion', 'Welfare Fraud',
            'Worthless Check: Felony (over $2000)', 'Bribery', 'Extortion/Blackmail'
        ],
        drug: [
            'Drug/Narcotic Violations', 'Drug Equipment Violations',
            'Liquor Law Violations', 'Driving Under The Influence', 'Overdose'
        ],
        publicOrder: [
            'Disorderly Conduct', 'Trespass Of Real Property',
            'Curfew/Loitering/Vagrancy Violations', 'Gambling Equipment Violations',
            'Assisting Gambling', 'Betting/Wagering', 'Family Offenses; Nonviolent'
        ],
        weapons: [
            'Weapon Law Violations'
        ],
        other: [
            'All Other Offenses', 'Other Unlisted Non-Criminal', 'Missing Person',
            'Suicide', 'Sudden/Natural Death Investigation', 'Public Accident',
            'Fire (Accidental/Non-Arson)', 'Gas Leak', 'Vehicle Recovery',
            'Animal Cruelty', 'Dog Bite/Animal Control Incident'
        ]
    },

    // Map settings
    map: {
        width: 1000,
        height: 600,
        centerLat: 35.2271,
        centerLon: -80.8431
    }
};

// ===========================================================================
// GLOBAL STATE
// ===========================================================================

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
        filtered: []
    },
    filters: {
        startDate: null,
        endDate: null,
        crimeTypes: ['all'],
        zipCode: 'all'
    },
    currentView: 'heatmap', // heatmap, choropleth, or points
    isLoading: false,
    map: null, // Leaflet map instance
    layers: {
        zipBoundaries: null,
        crimePoints: null
    }
};

// ===========================================================================
// UTILITY FUNCTIONS
// ===========================================================================

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
            year: 'numeric',
            month: 'short',
            day: 'numeric'
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
            violent: CONFIG.colors.red,           // Red - #DE0505
            sex: CONFIG.colors.purple,            // Purple - #59489F
            property: CONFIG.colors.orange,       // Orange - #EA9B3E
            fraud: CONFIG.colors.yellow,          // Yellow - #FADD4A (changed to darker)
            drug: CONFIG.colors.medBlue,          // Med Blue - #02508E
            publicOrder: CONFIG.colors.legacyGreen, // Legacy Green - #007953 (changed from light green)
            weapons: CONFIG.colors.darkRed,       // Dark Red - #C70000
            other: CONFIG.colors.blue             // Blue - #2F70B8
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

// ===========================================================================
// DATA LOADING & PROCESSING
// ===========================================================================

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

            // Log sample to help debug
            if (STATE.rawData.zipCodes.features && STATE.rawData.zipCodes.features.length > 0) {
                console.log('Sample ZIP feature:', STATE.rawData.zipCodes.features[0]);
            }

            // Load incidents (may be large - limit for demo if needed)
            console.log('Fetching incidents from:', CONFIG.apis.incidents);
            const incidentsResponse = await fetch(CONFIG.apis.incidents);

            if (!incidentsResponse.ok) {
                throw new Error(`Incidents API error: ${incidentsResponse.status}`);
            }

            STATE.rawData.incidents = await incidentsResponse.json();
            console.log('Incidents loaded:', STATE.rawData.incidents.features?.length || 0);

            // Log sample to help debug
            if (STATE.rawData.incidents.features && STATE.rawData.incidents.features.length > 0) {
                console.log('Sample incident feature:', STATE.rawData.incidents.features[0]);
            }

            // Process the data
            this.processData();

            // Update UI with last updated time
            document.getElementById('lastUpdated').textContent = new Date().toLocaleDateString();

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

        // Charlotte area bounds (Mecklenburg County approximate)
        const CHARLOTTE_BOUNDS = {
            minLon: -81.2,
            maxLon: -80.5,
            minLat: 34.9,
            maxLat: 35.5
        };

        // Function to check if a coordinate is reasonable (not world-spanning)
        const isValidCoordinate = (lon, lat) => {
            // Check if coordinates are in reasonable range for US
            return lon >= -180 && lon <= -70 && lat >= 25 && lat <= 50;
        };

        // Process ZIP codes with minimal filtering
        let validCount = 0;
        let invalidCount = 0;

        STATE.processedData.zipCodes = STATE.rawData.zipCodes.features
            .map((feature, index) => {
                const props = feature.properties;
                const geom = feature.geometry;

                // Very basic geometry check - just make sure coordinates exist and aren't null
                if (!geom || !geom.coordinates || geom.coordinates.length === 0) {
                    invalidCount++;
                    return null;
                }

                // Check first coordinate to see if it's reasonable
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

                // Log first valid feature
                if (validCount === 1) {
                    console.log('First valid ZIP feature properties:', props);
                }

                // Try various field name patterns
                const zipCode = props.ZIPCODE || props.ZIP || props.zip ||
                              props.ZIPCODE5 || props.ZIP5 || props.zip5 ||
                              props.GEOID || props.geoid || props.NAME || props.name;

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

        // If no ZIP codes, log error
        if (STATE.processedData.zipCodes.length === 0) {
            console.error('No valid ZIP codes found!');
        }

        // Process incidents
        STATE.processedData.incidents = STATE.rawData.incidents.features.map(feature => {
            const props = feature.properties;
            const coords = feature.geometry?.coordinates || [];

            // Try to extract date from various possible field names
            const dateValue = props.date || props.DATE || props.date_reported ||
                            props.DATE_REPORTED || props.datetime || props.DATETIME;

            return {
                id: props.OBJECTID || props.objectid || Math.random(),
                date: Utils.parseDate(dateValue),
                type: props.highest_nibrs_description || props.HIGHEST_NIBRS_DESCRIPTION ||
                      props.offense_description || props.OFFENSE_DESCRIPTION || 'Unknown',
                category: Utils.categorizeCrime(
                    props.highest_nibrs_description || props.HIGHEST_NIBRS_DESCRIPTION ||
                    props.offense_description || props.OFFENSE_DESCRIPTION || ''
                ),
                latitude: coords[1],
                longitude: coords[0],
                address: props.address || props.ADDRESS || '',
                zipCode: props.zip || props.ZIP || props.zipcode || null, // Keep original for reference
                nibrsCode: props.highest_nibrs_code || props.HIGHEST_NIBRS_CODE || null
            };
        }).filter(incident =>
            // Filter out incidents without coordinates or with invalid dates
            incident.latitude &&
            incident.longitude &&
            !isNaN(incident.latitude) &&
            !isNaN(incident.longitude) &&
            incident.date instanceof Date && !isNaN(incident.date)
        );

        // Spatially join incidents to ZIP codes based on coordinates
        console.log('Performing spatial join to match incidents to ZIP codes...');
        STATE.processedData.incidents = this.spatialJoinToZipCodes(STATE.processedData.incidents);

        console.log('Processed incidents:', STATE.processedData.incidents.length);

        // Set default date range
        const dates = STATE.processedData.incidents.map(d => d.date);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        STATE.filters.startDate = minDate;
        STATE.filters.endDate = maxDate;

        // Set date inputs
        document.getElementById('startDate').value = minDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = maxDate.toISOString().split('T')[0];

        // Populate ZIP code dropdown
        this.populateZipCodeDropdown();

        // Apply initial filter
        this.applyFilters();
    },

    // Populate ZIP code dropdown
    populateZipCodeDropdown() {
        const select = document.getElementById('zipCode');

        // Get ZIP codes from the clean boundary data instead of incident data
        const zipCodes = STATE.processedData.zipCodes
            .map(feature => feature.properties.zipCode)
            .filter(zip => zip && zip.length === 5) // Only valid 5-digit ZIPs
            .sort((a, b) => a.localeCompare(b));

        // Remove duplicates
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
            // Find which ZIP code polygon contains this incident's coordinates
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

    // Check if a point is inside a polygon (supporting Polygon and MultiPolygon)
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

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    },

    // Apply filters to data
    applyFilters() {
        let filtered = STATE.processedData.incidents;

        // Date filter
        if (STATE.filters.startDate) {
            filtered = filtered.filter(d => d.date >= STATE.filters.startDate);
        }
        if (STATE.filters.endDate) {
            filtered = filtered.filter(d => d.date <= STATE.filters.endDate);
        }

        // Crime type filter
        if (!STATE.filters.crimeTypes.includes('all')) {
            filtered = filtered.filter(d =>
                STATE.filters.crimeTypes.includes(d.category)
            );
        }

        // ZIP code filter
        if (STATE.filters.zipCode !== 'all') {
            filtered = filtered.filter(d => d.zipCode === STATE.filters.zipCode);
        }

        STATE.processedData.filtered = filtered;
        console.log('Filtered incidents:', filtered.length);

        // Update all visualizations
        Visualizations.updateAll();
    }
};

// ===========================================================================
// VISUALIZATIONS
// ===========================================================================

const Visualizations = {
    // Initialize Leaflet map
    initMap() {
        // Check if map already exists
        if (STATE.map) {
            STATE.map.remove();
        }

        // Create map centered on Charlotte
        STATE.map = L.map('mapVisualization', {
            center: [35.2271, -80.8431],
            zoom: 11,
            zoomControl: true
        });

        // Add OpenStreetMap tiles
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
            minZoom: 10,
            zIndex: 1
        });

        tileLayer.on('tileerror', function(error) {
            console.error('Tile loading error:', error);
        });

        tileLayer.on('tileload', function() {
            console.log('Tiles loading successfully');
        });

        tileLayer.addTo(STATE.map);

        // Create layer groups with explicit z-index
        STATE.layers.zipBoundaries = L.layerGroup().addTo(STATE.map);
        STATE.layers.zipBoundaries.setZIndex(400);

        STATE.layers.crimePoints = L.layerGroup().addTo(STATE.map);
        STATE.layers.crimePoints.setZIndex(500);

        console.log('Leaflet map initialized at', STATE.map.getCenter(), 'zoom:', STATE.map.getZoom());

        // Force map to render properly
        setTimeout(() => {
            STATE.map.invalidateSize();
            console.log('Map size invalidated');
        }, 100);
    },

    // Update all visualizations
    updateAll() {
        this.updateMap();
        this.updateTrendChart();
        this.updateDistributionChart();
        this.updateStatistics();
    },

    // Create/update map visualization
    updateMap() {
        const data = STATE.processedData.filtered;
        const zipCodes = STATE.processedData.zipCodes;

        console.log('updateMap called with', zipCodes.length, 'ZIP codes and', data.length, 'crimes');

        // Clear ALL existing layers from the map
        STATE.map.eachLayer(function(layer) {
            // Don't remove the tile layer
            if (layer instanceof L.TileLayer) {
                return;
            }
            // Remove everything else (markers, boundaries, etc.)
            STATE.map.removeLayer(layer);
        });

        // Clear layer groups safely
        if (STATE.layers.zipBoundaries) {
            STATE.layers.zipBoundaries.clearLayers();
        }
        if (STATE.layers.crimePoints) {
            STATE.layers.crimePoints.clearLayers();
        }

        // Verify map and layers exist
        if (!STATE.map) {
            console.error('Map not initialized');
            return;
        }

        // Add ZIP code boundaries
        if (zipCodes && zipCodes.length > 0) {
            // Pre-calculate crime counts per ZIP for choropleth
            const crimeCountsByZip = new Map();
            if (STATE.currentView === 'choropleth') {
                data.forEach(crime => {
                    const count = crimeCountsByZip.get(crime.zipCode) || 0;
                    crimeCountsByZip.set(crime.zipCode, count + 1);
                });

                // Find max for color scale
                const maxCrimes = Math.max(...Array.from(crimeCountsByZip.values()));
                console.log('Choropleth max crimes:', maxCrimes);

                zipCodes.forEach(zipFeature => {
                    const zipCode = zipFeature.properties.zipCode;
                    const crimeCount = crimeCountsByZip.get(zipCode) || 0;

                    const intensity = crimeCount / maxCrimes;
                    const style = {
                        fillColor: d3.interpolateReds(intensity),
                        weight: 2,
                        opacity: 1,
                        color: '#24B24A',
                        fillOpacity: 0.7
                    };

                    const layer = L.geoJSON(zipFeature, {
                        style: style,
                        onEachFeature: (feature, layer) => {
                            layer.bindPopup(`
                                <strong>ZIP Code: ${zipCode}</strong><br/>
                                Incidents: ${crimeCount}
                            `);
                        }
                    });

                    if (STATE.layers.zipBoundaries) {
                        STATE.layers.zipBoundaries.addLayer(layer);
                    }
                });
            } else {
                // Regular view - just show boundaries
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
                                        fillColor: '#7BF44',
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

                    if (STATE.layers.zipBoundaries) {
                        STATE.layers.zipBoundaries.addLayer(layer);
                    }
                });
            }
        }

        // Add crime points
        if (STATE.currentView === 'points' || STATE.currentView === 'heatmap') {
            console.log('Adding', data.length, 'crime points to map');

            let successCount = 0;
            let errorCount = 0;

            data.forEach((crime, index) => {
                if (!crime.latitude || !crime.longitude) {
                    return; // Skip if no coordinates
                }

                try {
                    const color = Utils.getCrimeColor(crime.category);

                    // Create a custom DivIcon instead of CircleMarker
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

                    // Add directly to map
                    marker.addTo(STATE.map);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    if (errorCount <= 3) {
                        console.error('Error adding marker:', error);
                    }
                }
            });

            console.log('Crime points added:', successCount, 'successful,', errorCount, 'errors');
        }

        // Update legend
        this.updateMapLegend();
    },

    // Update map legend
    updateMapLegend() {
        const legend = d3.select('#mapLegend');
        legend.selectAll('*').remove();

        const categories = [
            { name: 'Violent Crimes', color: CONFIG.colors.red, category: 'violent' },
            { name: 'Sex Crimes', color: CONFIG.colors.purple, category: 'sex' },
            { name: 'Property Crimes', color: CONFIG.colors.orange, category: 'property' },
            { name: 'Fraud / Financial', color: CONFIG.colors.yellow, category: 'fraud' },
            { name: 'Drug & Alcohol', color: CONFIG.colors.medBlue, category: 'drug' },
            { name: 'Public Order', color: CONFIG.colors.legacyGreen, category: 'publicOrder' },
            { name: 'Weapons', color: CONFIG.colors.darkRed, category: 'weapons' },
            { name: 'Other', color: CONFIG.colors.blue, category: 'other' }
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

        // Clear existing chart
        d3.select('#trendVisualization').selectAll('*').remove();

        const svg = d3.select('#trendVisualization');
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Aggregate data by month
        const monthlyData = d3.rollup(
            data,
            v => v.length,
            d => d3.timeMonth(d.date)
        );

        const aggregated = Array.from(monthlyData, ([date, count]) => ({ date, count }))
            .sort((a, b) => a.date - b.date);

        if (aggregated.length === 0) {
            g.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .text('No data available for selected filters');
            return;
        }

        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(aggregated, d => d.date))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(aggregated, d => d.count)])
            .nice()
            .range([height, 0]);

        // Add axes
        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(6));

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));

        // Add grid
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

        // Add line
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.count))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(aggregated)
            .attr('class', 'line')
            .attr('d', line);

        // Add area
        const area = d3.area()
            .x(d => x(d.date))
            .y0(height)
            .y1(d => y(d.count))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(aggregated)
            .attr('class', 'line-area')
            .attr('d', area);

        // Add labels
        g.append('text')
            .attr('x', width / 2)
            .attr('y', height + 40)
            .attr('text-anchor', 'middle')
            .text('Month');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .text('Number of Incidents');
    },

    // Create/update distribution chart
    updateDistributionChart() {
        const data = STATE.processedData.filtered;

        // Clear existing chart
        d3.select('#distributionVisualization').selectAll('*').remove();

        const svg = d3.select('#distributionVisualization');
        const margin = { top: 20, right: 20, bottom: 80, left: 60 };
        const width = 400 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Aggregate by category
        const categoryData = d3.rollup(
            data,
            v => v.length,
            d => d.category
        );

        const aggregated = Array.from(categoryData, ([category, count]) => ({
            category,
            count
        })).sort((a, b) => b.count - a.count);

        if (aggregated.length === 0) {
            g.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .text('No data available');
            return;
        }

        // Scales
        const x = d3.scaleBand()
            .domain(aggregated.map(d => d.category))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(aggregated, d => d.count)])
            .nice()
            .range([height, 0]);

        // Add axes
        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));

        // Add bars
        g.selectAll('.bar')
            .data(aggregated)
            .enter()
            .append('rect')
            .attr('class', d => `bar ${d.category}`)
            .attr('x', d => x(d.category))
            .attr('y', d => y(d.count))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.count))
            .on('mouseover', function(event, d) {
                Utils.showTooltip(event, `
                    <strong>${d.category}</strong><br/>
                    Count: ${Utils.formatNumber(d.count)}<br/>
                    Percentage: ${((d.count / data.length) * 100).toFixed(1)}%
                `);
            })
            .on('mouseout', Utils.hideTooltip);

        // Add labels
        g.append('text')
            .attr('x', width / 2)
            .attr('y', height + 50)
            .attr('text-anchor', 'middle')
            .text('Crime Category');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .text('Number of Incidents');
    },

    // Update statistics panel
    updateStatistics() {
        const data = STATE.processedData.filtered;

        const violent = data.filter(d => d.category === 'violent').length;
        const property = data.filter(d => d.category === 'property').length;

        // Calculate average per day
        const dateRange = (STATE.filters.endDate - STATE.filters.startDate) / (1000 * 60 * 60 * 24);
        const avgPerDay = dateRange > 0 ? (data.length / dateRange).toFixed(1) : 0;

        document.getElementById('totalCrimes').textContent = Utils.formatNumber(data.length);
        document.getElementById('violentCrimes').textContent = Utils.formatNumber(violent);
        document.getElementById('propertyCrimes').textContent = Utils.formatNumber(property);
        document.getElementById('crimeRate').textContent = avgPerDay;
    }
};

// ===========================================================================
// EVENT HANDLERS
// ===========================================================================

const EventHandlers = {
    // Initialize all event listeners
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

        // Map view toggle
        document.querySelectorAll('.view-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.view-option').forEach(opt =>
                    opt.classList.remove('active')
                );
                e.target.classList.add('active');
                STATE.currentView = e.target.dataset.view;
                Visualizations.updateMap();
            });
        });
    }
};

// ===========================================================================
// INITIALIZATION
// ===========================================================================

async function init() {
    console.log('Initializing Charlotte Crime Dashboard...');

    // Initialize Leaflet map first
    Visualizations.initMap();

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