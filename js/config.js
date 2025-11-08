export const DATA_SOURCES = {
    incidents: 'data/incidents.csv',
    zipCodes: 'data/zipcodes.csv'
};

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

export const CATEGORY_ORDER = [
    'violent', 'sex', 'property', 'fraud',
    'drug', 'publicOrder', 'weapons', 'other'
];

export const CATEGORY_COLORS = {
    violent: '#DE0505',
    sex: '#59489F',
    property: '#EA9B3E',
    fraud: '#FADD4A',
    drug: '#02508E',
    publicOrder: '#007953',
    weapons: '#C70000',
    other: '#2F70B8'
};

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

export const MAP_CONFIG = {
    centerLat: 35.2271,
    centerLon: -80.8431,
    defaultZoom: 11,
    minZoom: 10,
    maxZoom: 18
};

export const CHART_CONFIG = {
    margin: { top: 20, right: 100, bottom: 150, left: 80 },
    height: 750,
    legendItemsPerRow: 4,
    barPadding: 0.2
};
