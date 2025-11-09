# Crime Lens of Charlotte

**Author:** Mahek Patel  
**Course:** DATA 760 - VISUALIZATION & COMMUNICATION

---

## Project Overview

Crime Lens of Charlotte is an interactive data visualization dashboard that explores crime patterns and trends in
Charlotte, North Carolina. Built with D3.js, Leaflet, and vanilla JavaScript, this project provides an intuitive
interface for understanding crime distribution across ZIP codes, temporal patterns, and crime type classifications.

The dashboard leverages real-time data from the Charlotte Open Data Portal to create a comprehensive view of public
safety incidents, featuring interactive maps, dynamic filtering, and visual analytics that help users discover insights
about crime in Charlotte-Mecklenburg.

---

## Features
### Interactive Visualizations

1. **Incident Crime Map**
    - Interactive Leaflet map displaying individual crime incidents as colored markers
    - ZIP code boundary overlays with hover and click interactions
    - Click ZIP boundaries to filter and zoom to specific areas
    - Click crime markers to filter by crime category
    - Dynamic marker sizing based on zoom level
    - Color-coded by crime type (violent, property, drug, etc.)

2. **Temporal Crime Trends**
    - Multi-line chart showing crime trends from 2017-2023
    - Separate color-coded line for each crime category
    - Monthly aggregation showing patterns over time
    - Interactive legend with hover-to-highlight functionality
    - Tooltips showing exact counts for each data point
    - Helps identify seasonal patterns, spikes, and long-term trends

3. **Top Crime Hotspots by ZIP Code**
    - Horizontal stacked bar chart showing top 15 ZIP codes by incident count
    - Each bar displays crime breakdown by category
    - Click bars to filter and zoom to that ZIP code on the map
    - Real-time updates based on active filters

4. **Crime Type Treemap**
    - Zoomable hierarchical treemap visualization
    - Click to drill down from crime categories to specific offense types
    - Size represents incident frequency
    - Interactive exploration of crime type distribution

5. **Crime Type Reference Guide**
    - Comprehensive breakdown of all crime categories
    - Shows specific NIBRS offense codes within each category
    - Color-coded to match visualizations

### Filtering & Interactivity
- **Date Range Filter**: Select custom time periods to analyze temporal patterns
- **Crime Type Filter**: Multi-select dropdown to focus on specific crime categories
- **ZIP Code Filtering**: Click map boundaries or chart bars to drill down by location
- **Crime Category Filtering**: Click individual crime markers to filter by type
- **Reset Button**: Quickly clear all filters and return to full dataset view
- **Synchronized Views**: All filters update all visualizations simultaneously

### Technical Features
- **Spatial Join Analysis**: Accurate ZIP code assignment using point-in-polygon algorithms with bounding box
  optimization
- **Local Data Storage**: Uses CSV files instead of live APIs to ensure data availability during government shutdowns
- **Client-side Caching**: Efficient data loading with in-memory caching
- **Responsive Design**: Mobile-friendly layout with breakpoints for tablet and desktop
- **Performance Optimized**: Viewport-based rendering for thousands of crime markers
- **Accessible**: Keyboard navigation and ARIA labels for screen readers

### Design & Development References
1. [**Design Resources for Developers** - Brad Traversy](https://github.com/bradtraversy/design-resources-for-developers?tab=readme-ov-file#html--css-templates)
HTML/CSS templates and design inspiration
2. [**Charlotte Identity Guide v3.1** - City of Charlotte](https://www.charlottenc.gov/files/sharedassets/city/v/1/city-government/departments/documents/charlotte-identity-guide-v-3-1.pdf)
Official brand guidelines for color palette and typography
3. [**The D3 Graph Gallery** - Yan Holtz](https://d3-graph-gallery.com/index.html)
D3.js visualization examples and code patterns
4. [**ObservableHQ** - Mike Bostock](https://observablehq.com/@d3/gallery)
D3 gallery examples
5. [**How to Make API Calls in JavaScript** - freeCodeCamp](https://www.freecodecamp.org/news/make-api-calls-in-javascript/)
Guide for making API calls using Fetch API

---

## Data Sources

### Current Data Files

1. **data/incidents.csv** - CMPD crime incidents (5,000 records)
   - Contains coordinates, dates, crime types, addresses, and patrol divisions
   - Originally from: [Charlotte Open Data Portal - CMPD Incidents](https://data.charlottenc.gov/datasets/charlotte::cmpd-incidents-1/about)

2. **data/zipcodes.csv** - ZIP code boundaries (43 ZIP codes)
   - Contains ZIP codes and polygon geometries for Mecklenburg County
   - Originally from: Mecklenburg County GIS Services

### Updating Data

To fetch the latest crime data from Charlotte Open Data Portal:

**Option 1: GitHub Actions (Recommended)**
1. Go to the **Actions** tab in GitHub
2. Select **"Update Crime Data"** workflow
3. Click **"Run workflow"**
4. Wait 1-2 minutes for completion
5. New data will be automatically committed

**Option 2: Run Locally**
```bash
# Install dependencies
pip install -r requirements.txt

# Run the data fetcher
python fetch_data.py
```

## Technologies Used
- **D3.js** - Data visualizations and charts
- **Leaflet** - Interactive maps
- **HTML/CSS** - Page layout and styling
- **JavaScript** - Application logic
- **GeoJSON** - Geographic data format

---

## Project Structure

```
crime-lens-of-charlotte/
├── index.html              # Main page with all the visualizations
├── styles.css              # All the styling
├── data/
│   ├── incidents.csv       # Crime incident data (5,000 records)
│   └── zipcodes.csv        # ZIP code boundaries (43 ZIPs)
├── js/
│   ├── main.js             # Kicks everything off
│   ├── config.js           # Settings and constants
│   ├── state.js            # Stores all the data
│   ├── utils.js            # Helper functions
│   ├── dataLoad.js         # Loads CSV files
│   ├── dataProcessor.js    # Cleans up the data
│   ├── spatial.js          # ZIP code calculations
│   ├── filters.js          # Filter logic
│   ├── ui.js               # Connects buttons and dropdowns
│   ├── tabs.js             # Tab navigation
│   ├── mapVisuals.js       # Leaflet map
│   ├── temporal.js         # Animated temporal visualization
│   ├── barChart.js         # D3 bar chart
│   └── treemap.js          # D3 treemap
└── css/
    └── styles.css          # All styling and animations
```

---

## Setup
### Running the Project
### [Click here to access without downloading](https://mpate1001.github.io/crime-lens-of-charlotte/)

#### Python
```bash
# Navigate to the project directory
cd crime-lens-of-charlotte

# Python 3
python3 -m http.server 8000
```
Then open your browser and navigate to `http://localhost:8000`

### What to Expect
Once the application loads:
- The dashboard will load crime data from local CSV files (5,000 incidents, 2017-2023)
- Initial load may take a few seconds depending on dataset size
- Three main tabs will be available:
    1. **Crime Map**: Interactive Leaflet map with ZIP code boundaries and filterable crime markers
    2. **Temporal Crime**: Line chart showing crime trends over time by category (2017-2023)
    3. **Metrics**: Crime hotspots by ZIP code (stacked bar chart) and zoomable treemap
- Crime type reference guide displays all 8 crime categories
- Use the filter controls to explore different time periods and crime types
- Click on map elements (ZIP boundaries or crime markers) to filter interactively
- Click on bars in the hotspots chart to zoom and filter by ZIP code
- Use the temporal animation to visualize how crime evolved over 6 years

---

## How to Use the Dashboard
### Exploring the Map
1. **View Crime Incidents**: Each colored circle represents a crime incident, color-coded by category
2. **Hover over ZIP boundaries**: See the ZIP code and total incident count
3. **Click ZIP boundaries**: Filter all visualizations to that ZIP code and zoom to its bounds
4. **Click crime markers**: Filter all visualizations to that crime category
5. **Click map background**: Clear ZIP and crime category filters
6. **Pan and Zoom**: Use mouse/trackpad to navigate the map

### Using Filters
1. **Date Range**:
    - Use the date pickers to select start and end dates
    - Default range shows all available data

2. **Crime Type**:
    - Multi-select dropdown (Ctrl+Click or Cmd+Click to select multiple)
    - Select "All Crime Types" to see everything
    - Choose specific categories to focus your analysis

3. **Reset Button**:
    - Clears all active filters
    - Returns to default date range and "All Crime Types"
    - Deselects any ZIP code or category filters

### Using the Temporal Crime Trends
1. **Navigate to the Temporal Crime tab** (middle tab in the navigation)
2. **View the multi-line chart** showing monthly crime counts from 2017-2023
3. **Interact with the legend**:
   - Hover over any crime category in the legend to highlight that line
   - Other lines will fade to make the selected category stand out
4. **Hover over data points** to see exact counts for that month and category
5. **Look for patterns**:
   - Identify which crime categories are most common
   - Spot seasonal trends (e.g., spikes in certain months)
   - Notice long-term increases or decreases
   - Compare different crime categories over the same time period

### Interacting with Charts
**Top Crime Hotspots Chart:**
- Horizontal bars show crime breakdown by category for top 15 ZIP codes
- Hover over bar segments to see category details
- Click any bar to filter and zoom to that ZIP code on the map
- Stacked segments use same colors as crime type categories

**Crime Type Treemap:**
- Click any category box to zoom in and see specific offense types
- Click the breadcrumb at the top to zoom back out
- Size of each box represents the number of incidents
- Hover to see exact counts

### Understanding Crime Categories
The dashboard categorizes crimes into 8 NIBRS-based groups:
- **Violent Crimes** (Red): Murder, assault, robbery, kidnapping
- **Sex Crimes** (Purple): Sexual assault, human trafficking, prostitution
- **Property Crimes** (Orange): Burglary, theft, vandalism, arson
- **Fraud / Financial Crimes** (Yellow): Identity theft, embezzlement, forgery
- **Drug & Alcohol Offenses** (Blue): Drug violations, DUI, overdoses
- **Public Order Crimes** (Green): Disorderly conduct, trespassing, gambling
- **Weapons Offenses** (Dark Red): Weapon law violations
- **Special / Other Incidents** (Light Blue): Missing persons, non-criminal incidents