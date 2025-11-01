import requests
import json
import csv
import os
from datetime import datetime

# API endpoints
API_URLS = {
    'incidents': 'https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query?outFields=*&where=1%3D1&f=geojson',
    'zipCodes': 'https://meckgis.mecklenburgcountync.gov/server/rest/services/ZipCodeBoundaries/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson'
}

def fetch_geojson(url, name):
    """Fetch GeoJSON data from API"""
    print(f"Fetching {name}...")
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    data = response.json()
    print(f"✓ Fetched {len(data.get('features', []))} {name} records")
    return data

def geojson_to_csv(geojson_data, output_path):
    """Convert GeoJSON to CSV, flattening properties and geometry"""
    features = geojson_data.get('features', [])
    if not features:
        print(f"Warning: No features found in data")
        return

    # Collect all unique property keys
    all_keys = set()
    for feature in features:
        if 'properties' in feature:
            all_keys.update(feature['properties'].keys())

    # Add geometry fields
    fieldnames = sorted(all_keys)
    fieldnames.extend(['geometry_type', 'coordinates_lon', 'coordinates_lat', 'coordinates_json'])

    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for feature in features:
            row = {}

            # Copy properties
            if 'properties' in feature:
                for key, value in feature['properties'].items():
                    row[key] = value

            # Handle geometry
            if 'geometry' in feature and feature['geometry']:
                geom = feature['geometry']
                row['geometry_type'] = geom.get('type', '')

                coords = geom.get('coordinates', [])
                if coords:
                    # Handle different geometry types
                    if geom.get('type') == 'Point':
                        row['coordinates_lon'] = coords[0] if len(coords) > 0 else ''
                        row['coordinates_lat'] = coords[1] if len(coords) > 1 else ''
                    elif geom.get('type') == 'Polygon':
                        # For polygons, store full JSON
                        row['coordinates_json'] = json.dumps(coords)
                    elif geom.get('type') == 'MultiPolygon':
                        # For multi-polygons, store full JSON
                        row['coordinates_json'] = json.dumps(coords)
                    else:
                        row['coordinates_json'] = json.dumps(coords)

            writer.writerow(row)

    print(f"✓ Saved to {output_path}")

def main():
    # Create data directory if it doesn't exist
    data_dir = '../data'
    os.makedirs(data_dir, exist_ok=True)

    print("="*60)
    print("Charlotte Crime Data Fetcher")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    # Fetch and save incidents data
    try:
        incidents_data = fetch_geojson(API_URLS['incidents'], 'incidents')
        geojson_to_csv(incidents_data, os.path.join(data_dir, 'incidents.csv'))
    except Exception as e:
        print(f"✗ Error fetching incidents: {e}")

    # Fetch and save ZIP codes data
    try:
        zipcodes_data = fetch_geojson(API_URLS['zipCodes'], 'ZIP codes')
        geojson_to_csv(zipcodes_data, os.path.join(data_dir, 'zipcodes.csv'))
    except Exception as e:
        print(f"✗ Error fetching ZIP codes: {e}")

    print("="*60)
    print("✓ Data fetch complete!")
    print(f"Files saved to '{data_dir}/' directory")
    print("="*60)

if __name__ == '__main__':
    main()
