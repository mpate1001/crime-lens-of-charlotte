# Crime Lens of Charlotte

**Author:** Mahek Patel  
**Course:** DATA 760 - VISUALIZATION & COMMUNICATION

## Project Overview

Crime Lens of Charlotte is an interactive data visualization dashboard that explores crime patterns and trends in Charlotte, North Carolina. Using D3.js and geospatial analysis, this project provides an intuitive interface for understanding crime distribution across ZIP codes, temporal patterns, and crime type classifications.

The visualization leverages multiple datasets from the Charlotte Open Data Portal to create a comprehensive view of public safety data, enabling users to explore crime incidents through interactive charts, maps, and filtering mechanisms.

## Features

- **Interactive Geographic Visualization**: Crime data mapped to Charlotte ZIP code boundaries
- **Spatial Join Analysis**: Accurate ZIP code assignment using point-in-polygon algorithms
- **Multi-Dataset Integration**: Combines general incidents, homicides, and violent crime data
- **Temporal Analysis**: Filter and explore crime trends over time
- **Crime Type Categorization**: Visualize different crime classifications using NIBRS codes
- **Responsive Design**: Modern, accessible interface following Charlotte city branding guidelines

### Design & Development References

1. **Design Resources for Developers** - Brad Traversy  
   https://github.com/bradtraversy/design-resources-for-developers?tab=readme-ov-file#html--css-templates  
   HTML/CSS templates and design inspiration

2. **Charlotte Identity Guide v3.1** - City of Charlotte  
   https://www.charlottenc.gov/files/sharedassets/city/v/1/city-government/departments/documents/charlotte-identity-guide-v-3-1.pdf  
   Official brand guidelines for color palette and typography

3. **The D3 Graph Gallery** - Yan Holtz  
   https://d3-graph-gallery.com/index.html  
   D3.js visualization examples and code patterns

## Data Sources

All datasets are sourced from the [Charlotte Open Data Portal](https://data.charlottenc.gov/):

1. **CMPD Incidents**  
   https://data.charlottenc.gov/datasets/charlotte::cmpd-incidents-1/about  
   Complete incident reports including criminal and non-criminal offenses

2. **ZIP Codes (Geographic Boundaries)**  
   https://data.charlottenc.gov/datasets/charlotte::zip-codes/about  
   GeoJSON polygons for Charlotte-Mecklenburg ZIP code boundaries

3. **CMPD Homicides**  
   https://data.charlottenc.gov/datasets/charlotte::cmpd-homicide/about  
   Detailed homicide incident data

4. **CMPD Violent Crimes**  
   https://data.charlottenc.gov/datasets/charlotte::cmpd-violent-crime/about  
   Violent crime classifications and statistics

## Technologies Used

- **D3.js** (v7) - Data visualization and DOM manipulation
- **HTML5/CSS3** - Structure and styling
- **JavaScript (ES6+)** - Application logic
- **GeoJSON** - Geographic data format
- **Papa Parse** - CSV parsing library

## Installation & Setup

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Local web server (required for loading CSV files)

### Running the Project

1. Clone or download this repository

2. Ensure all project files are in the same directory: