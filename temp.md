# Charlotte Crime Data Visualization

## Project Overview
This project visualizes crime incident data for Charlotte, NC using an interactive map and bar chart. The data comes from Charlotte-Mecklenburg Police Department (CMPD) and shows different crime categories across ZIP codes.

---

## MAP

### Step 1: Map Initialization (Lines 297-334)

**What happens:**
- Creates a Leaflet map centered on Charlotte (coordinates: 35.2271, -80.8431)
- Uses OpenStreetMap tiles as the base layer
- Sets zoom levels between 10-18

```javascript
function initializeMap() {
    const mapElement = document.getElementById('mapVisualization');
    
    // Create the map with center point and zoom level
    const map = L.map(mapElement, {
        center: [MAP_CENTER_LAT, MAP_CENTER_LON],
        zoom: MAP_DEFAULT_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM
    });
    
    // Add the OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '...'
    }).addTo(map);
}
```

**Key Technologies:**
- **Leaflet.js**: JavaScript library for interactive maps
- **OpenStreetMap**: Free map tiles that provide the base map imagery

### Step 2: Loading ZIP Code Boundaries (Lines 336-382)

**What happens:**
- Fetches GeoJSON data for Mecklenburg County ZIP codes
- Draws polygon boundaries for each ZIP code on the map
- Calculates bounding boxes for spatial analysis

```javascript
async function loadAllData() {
    // Fetch ZIP code boundaries from the county GIS server
    const zipGeoJSON = await fetchData(API_URLS.zipCodes, 'ZIP codes');
    
    // Store the features for later use
    STATE.data.zipCodes = zipGeoJSON.features;
    
    // Calculate bounding boxes for each ZIP code
    zipGeoJSON.features.forEach(feature => {
        const bbox = calculateBoundingBox(feature.geometry);
        STATE.zipBboxes.push({
            zipCode: feature.properties.ZIP,
            bbox: bbox
        });
    });
}
```

**Bounding Box Calculation (Lines 187-205):**
- Finds the minimum and maximum X (longitude) and Y (latitude) coordinates
- Creates a rectangular box around each ZIP code for faster point-in-polygon checks

### Step 3: Displaying ZIP Code Polygons (Lines 400-466)

**What happens:**
- Creates a GeoJSON layer with all ZIP code boundaries
- Styles each ZIP code based on crime density (choropleth map)
- Adds hover effects and click interactions

```javascript
const zipLayer = L.geoJSON(zipGeoJSON, {
    style: function(feature) {
        const zipCode = feature.properties.ZIP;
        const count = zipCounts[zipCode] || 0;
        
        // Color intensity based on crime count
        const opacity = count > 0 ? 0.2 + (count / maxCount) * 0.5 : 0;
        
        return {
            fillColor: baseColor,    // Category-specific color
            fillOpacity: opacity,     // Darker = more crimes
            color: '#374151',         // Border color
            weight: 1.5
        };
    },
    
    onEachFeature: function(feature, layer) {
        // Add hover tooltip
        layer.on('mouseover', function(e) {
            // Show ZIP code and crime count
        });
        
        // Add click to filter
        layer.on('click', function(e) {
            // Filter data by this ZIP code
        });
    }
});
```

**Color Scheme:**
- Darker shades = more crime incidents
- Color changes based on crime category filter
- Opacity scales from 0.2 (low) to 0.7 (high)

### Step 4: Adding Crime Point Markers (Lines 467-545)

**What happens:**
- Places a circle marker for each crime incident
- Colors each marker by crime category
- Adds popup with crime details

```javascript
// Create marker cluster group for performance
const markers = L.markerClusterGroup({
    maxClusterRadius: 50,
    iconCreateFunction: function(cluster) {
        const childCount = cluster.getChildCount();
        // Size cluster icon based on number of incidents
        return L.divIcon({
            html: '<div><span>' + childCount + '</span></div>',
            className: 'marker-cluster',
            iconSize: L.point(40, 40)
        });
    }
});

// Add each incident as a circle marker
filteredIncidents.forEach(incident => {
    const marker = L.circleMarker([incident.lat, incident.lon], {
        radius: 6,
        fillColor: getCrimeColor(incident.category),
        color: '#fff',
        weight: 1,
        fillOpacity: 0.7
    });
    
    // Bind popup with incident details
    marker.bindPopup(`
        <strong>${incident.offense}</strong><br/>
        Date: ${formatDate(incident.date)}<br/>
        Category: ${CATEGORY_LABELS[incident.category]}<br/>
        ZIP: ${incident.zipCode}
    `);
    
    markers.addLayer(marker);
});

map.addLayer(markers);
```

**Marker Clustering:**
- When zoomed out, nearby points cluster together
- Shows count of incidents in each cluster
- Expands when you zoom in or click the cluster

---

## BAR Chart

### Step 1: Data Aggregation (Lines 571-593)

**What happens:**
- Counts incidents by ZIP code and crime category
- Creates a data structure for stacked bars

```javascript
function updateZipHotspotsChart() {
    // Count incidents by ZIP and category
    const zipCounts = {};
    
    STATE.filtered.forEach(incident => {
        const zip = incident.zipCode || 'Unknown';
        if (!zipCounts[zip]) {
            zipCounts[zip] = {
                zip: zip,
                total: 0,
                violent: 0,
                sex: 0,
                property: 0,
                fraud: 0,
                drug: 0,
                publicOrder: 0,
                weapons: 0,
                other: 0
            };
        }
        
        const category = incident.category;
        zipCounts[zip][category]++;
        zipCounts[zip].total++;
    });
    
    // Convert to array and sort by total
    const zipData = Object.values(zipCounts)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);  // Top 15 ZIP codes
}
```

### Step 2: D3.js Chart Setup (Lines 594-615)

**What happens:**
- Creates an SVG canvas for the chart
- Sets up scales and axes

```javascript
// Define chart dimensions
const margin = {top: 20, right: 100, bottom: 150, left: 80};
const width = containerWidth - margin.left - margin.right;
const height = CHART_HEIGHT - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select('#zipHotspots')
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', CHART_HEIGHT);

// Create chart group with margins
const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
```

**What is D3.js?**
- **Data-Driven Documents** - JavaScript library for data visualization
- Binds data to DOM elements
- Provides powerful scales, axes, and layout functions

### Step 3: Creating Scales (Lines 600-618)

**Scales** map data values to visual properties (position, size, color)

```javascript
// X-Scale: Maps crime counts to horizontal position
const xScale = d3.scaleLinear()
    .domain([0, d3.max(zipData, d => d.total)])  // Data range
    .range([0, innerWidth]);                      // Pixel range

// Y-Scale: Maps ZIP codes to vertical position (categorical)
const yScale = d3.scaleBand()
    .domain(zipData.map(d => d.zip))  // All ZIP codes
    .range([0, innerHeight])          // Pixel range
    .padding(0.2);                    // Space between bars

// Axes
const xAxis = d3.axisBottom(xScale);  // Bottom axis with ticks
const yAxis = d3.axisLeft(yScale);    // Left axis with ZIP labels
```

**Scale Types:**
- **scaleLinear**: For continuous numeric data (crime counts)
- **scaleBand**: For categorical data (ZIP codes) with spacing

### Step 4: Creating Stacked Bars (Lines 646-684)

**What happens:**
- Uses D3's stack layout to create stacked bar segments
- Each segment represents a crime category

```javascript
// Stack layout - creates layers for each category
const stack = d3.stack()
    .keys(CATEGORY_ORDER)  // Crime categories
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

const series = stack(zipData);

// Create bar groups (one per category)
const barGroups = g.selectAll('.bar-group')
    .data(series)
    .join('g')
    .attr('class', 'bar-group')
    .attr('fill', d => getCrimeColor(d.key));  // Category color

// Create rectangles within each group
barGroups.selectAll('rect')
    .data(d => d)  // Stack layer data
    .join('rect')
    .attr('x', d => xScale(d[0]))              // Start position
    .attr('y', d => yScale(d.data.zip))        // ZIP position
    .attr('width', d => xScale(d[1]) - xScale(d[0]))  // Segment width
    .attr('height', yScale.bandwidth());       // Bar height
```

**How Stacking Works:**
- Each crime category gets a segment
- Segments stack horizontally (left to right)
- d[0] = start position, d[1] = end position
- Width = difference between start and end

### Step 5: Adding Interactivity (Lines 660-684)

**What happens:**
- Hover shows tooltip with details
- Click filters map to that ZIP code

```javascript
barGroups.selectAll('rect')
    .on('mouseover', function(event, d) {
        const category = d3.select(this.parentNode).datum().key;
        const count = d.data[category];
        
        showTooltip(event, `
            <strong>ZIP ${d.data.zip}</strong><br/>
            ${CATEGORY_LABELS[category]}: ${count}<br/>
            Total: ${d.data.total}<br/>
            <em>Click to filter and zoom</em>
        `);
    })
    .on('mouseout', hideTooltip)
    .on('click', function(event, d) {
        // Filter by ZIP code
        STATE.filters.zipCode = d.data.zip;
        applyFilters();
        
        // Zoom map to ZIP boundary
        const zipFeature = zipFeatures.find(f => 
            f.properties.zipCode === d.data.zip
        );
        map.fitBounds(zipFeature.geometry);
    });
```

### Step 6: Adding Legend (Lines 698-726)

**What happens:**
- Creates color-coded legend below the chart
- Shows what each color represents

```javascript
const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${margin.left}, ${legendY})`);

const legendItems = legend.selectAll('.legend-item')
    .data(CATEGORY_ORDER)
    .join('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => {
        const row = Math.floor(i / 4);  // 4 items per row
        const col = i % 4;
        return `translate(${col * itemWidth}, ${row * 22})`;
    });

// Add colored rectangles
legendItems.append('rect')
    .attr('width', 14)
    .attr('height', 14)
    .attr('fill', d => getCrimeColor(d));

// Add labels
legendItems.append('text')
    .attr('x', 20)
    .attr('y', 7)
    .text(d => CATEGORY_LABELS[d]);
```

---

## 🔄 DATA FLOW

### Complete Pipeline:

1. **Fetch Data** (Lines 336-382)
   - Load crime incidents from CMPD API
   - Load ZIP code boundaries from county GIS

2. **Process Data** (Lines 221-295)
   - Categorize each crime by type
   - Assign each incident to a ZIP code using point-in-polygon
   - Parse dates from various formats

3. **Apply Filters** (Lines 384-398)
   - Filter by date range
   - Filter by crime type
   - Filter by ZIP code

4. **Update Visualizations** (Lines 728-731)
   - Redraw map with filtered points
   - Recalculate and redraw bar chart
   - Update statistics

5. **Handle Interactions**
   - User hovers → show tooltip
   - User clicks bar → filter map and zoom
   - User clicks map → show popup
   - User changes filters → reprocess data

---

## KEY CONCEPTS TO UNDERSTAND

### 1. GeoJSON
- Standard format for geographic data
- Contains geometry (coordinates) and properties (attributes)
- Used for both ZIP boundaries and crime points

### 2. Choropleth Map
- Thematic map where areas are colored based on data values
- ZIP codes colored by crime density
- Darker = more incidents

### 3. Stacked Bar Chart
- Shows composition and comparison
- Each bar divided into segments (crime categories)
- Total length = total incidents

### 4. Spatial Join
- Determining which ZIP code each crime point belongs to
- Uses point-in-polygon algorithm (ray casting)
- Bounding box optimization for performance

### 5. Data Binding (D3.js Concept)
- Connecting data to visual elements
- `.data(array)` binds data
- `.join('rect')` creates/updates/removes rectangles
- Changes in data automatically update visuals

---

## Libraries Used

1. **Leaflet.js** - Interactive maps
2. **D3.js** - Data-driven visualizations  
3. **Leaflet.markercluster** - Groups nearby markers for performance
4. **OpenStreetMap** - Free map tiles



Good luck with your presentation!
