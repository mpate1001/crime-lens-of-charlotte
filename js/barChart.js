/**
 * BARCHART.JS - Stacked bar chart showing crime hotspots by ZIP code
 *
 * Uses D3.js to create a horizontal bar chart showing the top 15 ZIP codes
 * with the most crime. Each bar is stacked by crime category so you can see
 * the breakdown. Click a bar to filter and zoom to that ZIP.
 *
 */

import { state } from './state.js';
import { ELEMENT_IDS, CHART_CONFIG, CATEGORY_ORDER, CATEGORY_LABELS } from './config.js';
import { getCrimeColor, showTooltip, hideTooltip, renderEmptyMessage } from './utils.js';
import { applyFilters } from './filters.js';

// Update the ZIP code hotspots chart
export function updateZipHotspotsChart() {
    const data = state.data.incidents; // Use all data, not filtered
    const zipFeatures = state.data.zipCodes;
    const svg = d3.select('#' + ELEMENT_IDS.zipHotspots);

    // Clear out the old chart
    svg.selectAll('*').remove();

    // If there's no data, show a message
    if (!data || data.length === 0) {
        renderEmptyMessage('#' + ELEMENT_IDS.zipHotspots, 'No crime data available');
        return;
    }

    // Group crimes by ZIP code and category
    const byZipCategory = d3.rollup(
        data.filter(d => d.zipCode),
        v => v.length,
        d => d.zipCode,
        d => d.category
    );

    // Get the top 15 ZIP codes by total crime count
    const zipTotals = Array.from(byZipCategory, ([zip, categories]) => ({
        zip,
        total: d3.sum(Array.from(categories.values()))
    }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

    if (zipTotals.length === 0) {
        renderEmptyMessage('#' + ELEMENT_IDS.zipHotspots, 'No ZIP code data available');
        return;
    }

    // Format the data for D3's stack generator
    // Each row needs to have a count for every crime category
    const zipData = zipTotals.map(({ zip, total }) => {
        const row = { zip, total };
        const categories = byZipCategory.get(zip);

        // Add count for each category (use 0 if that ZIP has none)
        CATEGORY_ORDER.forEach(cat => {
            row[cat] = categories.get(cat) || 0;
        });

        return row;
    });

    // Figure out how big to make the chart
    const container = document.getElementById(ELEMENT_IDS.zipHotspots);
    const width = container?.clientWidth || 1100;
    const innerWidth = width - CHART_CONFIG.margin.left - CHART_CONFIG.margin.right;
    const innerHeight = CHART_CONFIG.height - CHART_CONFIG.margin.top - CHART_CONFIG.margin.bottom;

    // Set up the SVG
    svg
        .attr('viewBox', [0, 0, width, CHART_CONFIG.height])
        .attr('width', width)
        .attr('height', CHART_CONFIG.height)
        .style('max-width', '100%')
        .style('height', 'auto');

    const g = svg.append('g')
        .attr('transform', `translate(${CHART_CONFIG.margin.left},${CHART_CONFIG.margin.top})`);

    // Create scales (map data values to pixel positions)
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(zipData, d => d.total)])
        .range([0, innerWidth]);

    const yScale = d3.scaleBand()
        .domain(zipData.map(d => d.zip))
        .range([0, innerHeight])
        .padding(CHART_CONFIG.barPadding);

    // Stack the data by crime category
    const stack = d3.stack().keys(CATEGORY_ORDER);
    const series = stack(zipData);

    // Create the axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(6)
        .tickFormat(d3.format(',.0f'));

    const yAxis = d3.axisLeft(yScale);

    // Draw X-axis (bottom)
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

    // Draw Y-axis (left side)
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

    // Draw the stacked bars
    const barGroups = g.selectAll('.bar-group')
        .data(series)
        .join('g')
        .attr('class', 'bar-group')
        .attr('fill', d => getCrimeColor(d.key));

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

            showTooltip(event,
                `<strong>ZIP ${d.data.zip}</strong><br/>` +
                `${CATEGORY_LABELS[category]}: ${count.toLocaleString()}<br/>` +
                `Total: ${d.data.total.toLocaleString()}`
            );
        })
        .on('mouseout', hideTooltip);

    // Bar labels (totals)
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

    // Legend
    const legendY = CHART_CONFIG.margin.top + innerHeight + 50;
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${CHART_CONFIG.margin.left}, ${legendY})`);

    const itemWidth = innerWidth / CHART_CONFIG.legendItemsPerRow;
    const legendItems = legend.selectAll('.legend-item')
        .data(CATEGORY_ORDER)
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => {
            const row = Math.floor(i / CHART_CONFIG.legendItemsPerRow);
            const col = i % CHART_CONFIG.legendItemsPerRow;
            return `translate(${col * itemWidth}, ${row * 25})`;
        });

    // Legend color boxes
    legendItems.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => getCrimeColor(d));

    // Legend labels
    legendItems.append('text')
        .attr('x', 24)
        .attr('y', 9)
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .text(d => CATEGORY_LABELS[d]);
}
