/**
 * CONFIG.JS - All the constants and settings in one place
 *
 * This file has all the configuration stuff - colors, crime categories,
 * file paths, etc. Makes it easy to change things without digging through code.
 */

// Where our data lives (local CSV files so we don't depend on the API)
export const DATA_SOURCES = {
    incidents: 'data/incidents.csv',
    zipCodes: 'data/zipcodes.csv'
};

// Crime categories - we group NIBRS offense codes into 8 main types
// This makes it easier to visualize and filter crimes
export const CRIME_CATEGORIES = {
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
        'Purse-Snatching', 'Pocket-Picking', 'Shoplifting', 'All Other Thefts',
        'Theft From Coin-Operated Machine Or Device', 'Stolen Property Offenses'
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
    weapons: ['Weapon Law Violations'],
    other: [
        'All Other Offenses', 'Other Unlisted Non-Criminal', 'Missing Person',
        'Suicide', 'Sudden/Natural Death Investigation', 'Public Accident',
        'Fire (Accidental/Non-Arson)', 'Gas Leak', 'Vehicle Recovery',
        'Animal Cruelty', 'Dog Bite/Animal Control Incident'
    ]
};

// Friendly names for each category (shows up in the UI)
export const CATEGORY_LABELS = {
    violent: 'Violent Crimes',
    sex: 'Sex Crimes',
    property: 'Property Crimes',
    fraud: 'Fraud / Financial Crimes',
    drug: 'Drug & Alcohol Offenses',
    publicOrder: 'Public Order Crimes',
    weapons: 'Weapons Offenses',
    other: 'Special / Other Incidents'
};

// Order to display categories (most serious first)
export const CATEGORY_ORDER = [
    'violent', 'sex', 'property', 'fraud',
    'drug', 'publicOrder', 'weapons', 'other'
];

// Colors for each category - using Charlotte's official brand colors
export const CATEGORY_COLORS = {
    violent: '#DE0505',      // Red for violent crimes
    sex: '#59489F',          // Purple
    property: '#EA9B3E',     // Orange
    fraud: '#FADD4A',        // Yellow
    drug: '#02508E',         // Blue
    publicOrder: '#007953',  // Green
    weapons: '#C70000',      // Dark red
    other: '#2F70B8'         // Light blue
};

// HTML element IDs - keeps us from making typos
export const ELEMENT_IDS = {
    loading: 'loadingOverlay',
    tooltip: 'tooltip',
    map: 'mapVisualization',
    legend: 'mapLegend',
    startDate: 'startDate',
    endDate: 'endDate',
    zipCode: 'zipCode',
    crimeType: 'crimeType',
    resetButton: 'resetFilters',
    zipHotspots: 'zipHotspots',
    crimeGuide: 'crimeTypeGrid',
    incidentCount: 'incidentCount'
};

// Map settings for Charlotte
export const MAP_CONFIG = {
    centerLat: 35.2271,      // Charlotte's latitude
    centerLon: -80.8431,     // Charlotte's longitude
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 18
};

// Chart sizing and spacing
export const CHART_CONFIG = {
    margin: { top: 20, right: 100, bottom: 150, left: 80 },
    height: 750,
    legendItemsPerRow: 4,
    barPadding: 0.2
};
