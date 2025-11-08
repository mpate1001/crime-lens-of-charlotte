import { state } from './state.js';
import { CATEGORY_ORDER, CATEGORY_LABELS } from './config.js';
import { getCrimeColor } from './utils.js';

let isPlaying = false;
let currentMonthIndex = 0;
let animationInterval = null;
let chartData = [];
let categoryCounts = {};

export function initializetemporal() {
    const container = document.getElementById('temporalContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!state.data || !state.data.incidents || state.data.incidents.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:2rem;color:red;">No data available</p>';
        return;
    }

    chartData = prepareMonthlyData(state.data.incidents);
    currentMonthIndex = 0;
    drawLineChart(container);
}

function prepareMonthlyData(incidents) {
    const monthlyMap = d3.rollup(
        incidents,
        v => v.length,
        d => {
            const date = new Date(d.date);
            return new Date(date.getFullYear(), date.getMonth(), 1);
        },
        d => d.category || 'other'
    );

    const allMonths = new Set();
    monthlyMap.forEach((categories, month) => {
        allMonths.add(month);
    });
    const sortedMonths = Array.from(allMonths).sort((a, b) => a - b);

    const totalData = sortedMonths.map(month => {
        const categories = monthlyMap.get(month);
        const totalCount = categories ? Array.from(categories.values()).reduce((a, b) => a + b, 0) : 0;
        return { month, count: totalCount };
    });

    const categoryData = {};
    CATEGORY_ORDER.forEach(category => {
        categoryData[category] = sortedMonths.map(month => {
            const categories = monthlyMap.get(month);
            const count = categories && categories.has(category) ? categories.get(category) : 0;
            return { month, count };
        });
    });

    return { total: totalData, categories: categoryData, months: sortedMonths };
}

function drawLineChart(container) {
    const margin = { top: 100, right: 80, bottom: 120, left: 120 };
    const width = container.clientWidth || 1400;
    const height = 900;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.create('svg')
        .attr('viewBox', [0, 0, width, height])
        .attr('width', '100%')
        .attr('height', height)
        .style('max-width', '100%')
        .style('background', '#ffffff')
        .style('border', '1px solid #dee2e6')
        .style('border-radius', '8px');

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime()
        .domain(d3.extent(chartData.total, d => d.month))
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(chartData.total, d => d.count)])
        .nice()
        .range([innerHeight, 0]);

    const xAxis = d3.axisBottom(xScale)
        .ticks(d3.timeYear.every(1))
        .tickFormat(d3.timeFormat('%Y'));

    const yAxis = d3.axisLeft(yScale)
        .ticks(8);

    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', '13px');

    g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .selectAll('text')
        .attr('font-size', '13px');

    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 50)
        .attr('fill', '#111827')
        .attr('font-weight', '600')
        .attr('font-size', '14px')
        .attr('text-anchor', 'middle')
        .text('Time Period');

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -55)
        .attr('fill', '#111827')
        .attr('font-weight', '600')
        .attr('font-size', '14px')
        .attr('text-anchor', 'middle')
        .text('Total Monthly Incidents');

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 50)
        .attr('fill', '#111827')
        .attr('font-weight', '700')
        .attr('font-size', '36px')
        .attr('text-anchor', 'middle')
        .text('Total Crime Incidents Over Time (2017-2023)');

    const line = d3.line()
        .x(d => xScale(d.month))
        .y(d => yScale(d.count))
        .curve(d3.curveMonotoneX);

    const area = d3.area()
        .x(d => xScale(d.month))
        .y0(innerHeight)
        .y1(d => yScale(d.count))
        .curve(d3.curveMonotoneX);

    const categoryPaths = {};
    const categoryPathLengths = {};
    const categoryAreaPaths = {};
    const categoryAreaPathLengths = {};

    CATEGORY_ORDER.forEach(category => {
        const categoryArea = g.append('path')
            .datum(chartData.categories[category])
            .attr('fill', getCrimeColor(category))
            .attr('fill-opacity', 0.2)
            .attr('d', area);

        const areaPathLength = categoryArea.node().getTotalLength();
        categoryArea
            .attr('stroke-dasharray', areaPathLength + ' ' + areaPathLength)
            .attr('stroke-dashoffset', areaPathLength);

        categoryAreaPaths[category] = categoryArea;
        categoryAreaPathLengths[category] = areaPathLength;

        const categoryLine = g.append('path')
            .datum(chartData.categories[category])
            .attr('fill', 'none')
            .attr('stroke', getCrimeColor(category))
            .attr('stroke-width', 2)
            .attr('opacity', 0.8)
            .attr('d', line);

        const pathLength = categoryLine.node().getTotalLength();
        categoryLine
            .attr('stroke-dasharray', pathLength + ' ' + pathLength)
            .attr('stroke-dashoffset', pathLength);

        categoryPaths[category] = categoryLine;
        categoryPathLengths[category] = pathLength;
    });

    const linePath = g.append('path')
        .datum(chartData.total)
        .attr('fill', 'none')
        .attr('stroke', '#111827')
        .attr('stroke-width', 3)
        .attr('d', line);

    const totalLength = linePath.node().getTotalLength();

    linePath
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength);

    const areaPath = g.append('path')
        .datum(chartData.total)
        .attr('fill', '#111827')
        .attr('fill-opacity', 0.1)
        .attr('d', area);

    areaPath
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength);

    const currentDateLine = g.append('line')
        .attr('stroke', '#DE0505')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .style('opacity', 0);

    const currentValueText = svg.append('text')
        .attr('x', margin.left + 20)
        .attr('y', margin.top + 40)
        .attr('font-size', '24px')
        .attr('font-weight', '600')
        .attr('fill', '#24B24A')
        .style('opacity', 0);

    const cumulativeTotalText = svg.append('text')
        .attr('x', width - margin.right - 30)
        .attr('y', margin.top + 60)
        .attr('font-size', '72px')
        .attr('font-weight', '700')
        .attr('fill', '#24B24A')
        .attr('text-anchor', 'end')
        .attr('opacity', 0.9)
        .text('0');

    svg.append('text')
        .attr('x', width - margin.right - 30)
        .attr('y', margin.top + 85)
        .attr('font-size', '18px')
        .attr('font-weight', '500')
        .attr('fill', '#6c757d')
        .attr('text-anchor', 'end')
        .text('Total Incidents');

    function updateChart(index) {
        const progress = index / (chartData.total.length - 1);
        const drawLength = totalLength * (1 - progress);

        linePath.attr('stroke-dashoffset', drawLength);
        areaPath.attr('stroke-dashoffset', drawLength);

        CATEGORY_ORDER.forEach(category => {
            if (categoryPaths[category] && categoryPathLengths[category]) {
                const categoryDrawLength = categoryPathLengths[category] * (1 - progress);
                categoryPaths[category].attr('stroke-dashoffset', categoryDrawLength);
            }
            if (categoryAreaPaths[category] && categoryAreaPathLengths[category]) {
                const categoryAreaDrawLength = categoryAreaPathLengths[category] * (1 - progress);
                categoryAreaPaths[category].attr('stroke-dashoffset', categoryAreaDrawLength);
            }
        });

        if (index < chartData.total.length) {
            const currentData = chartData.total[index];
            currentDateLine
                .attr('x1', xScale(currentData.month))
                .attr('x2', xScale(currentData.month))
                .style('opacity', 1);

            currentValueText
                .text(`${d3.timeFormat('%B')(currentData.month)}: ${currentData.count} incidents`)
                .style('opacity', 1);

            // Calculate cumulative total up to current index
            const cumulativeTotal = chartData.total
                .slice(0, index + 1)
                .reduce((sum, d) => sum + d.count, 0);

            cumulativeTotalText
                .text(cumulativeTotal.toLocaleString());

            // Calculate cumulative counts by category
            const currentDate = chartData.total[index].month;
            const incidentsUpToDate = state.data.incidents.filter(d => d.date <= currentDate);

            // Count by category
            const categoryCounts = {};
            CATEGORY_ORDER.forEach(cat => categoryCounts[cat] = 0);

            incidentsUpToDate.forEach(incident => {
                const category = incident.category || 'other';
                if (categoryCounts[category] !== undefined) {
                    categoryCounts[category]++;
                }
            });

            // Update category displays
            if (window.categoryElements) {
                CATEGORY_ORDER.forEach(category => {
                    if (window.categoryElements[category]) {
                        window.categoryElements[category].textContent = categoryCounts[category].toLocaleString();
                    }
                });
            }
        }
    }

    // Create controls
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
        margin-top: 1.5rem;
        padding: 1rem;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
    `;

    // Play/Pause button
    const playButton = document.createElement('button');
    playButton.innerHTML = 'Play';
    playButton.style.cssText = `
        padding: 0.6rem 1.5rem;
        background: #24B24A;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    `;
    playButton.onmouseover = () => playButton.style.background = '#1e9a3d';
    playButton.onmouseout = () => playButton.style.background = '#24B24A';

    // Reset button
    const resetButton = document.createElement('button');
    resetButton.innerHTML = 'Reset';
    resetButton.style.cssText = `
        padding: 0.6rem 1.5rem;
        background: white;
        color: #111827;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    `;
    resetButton.onmouseover = () => {
        resetButton.style.background = '#f8f9fa';
        resetButton.style.borderColor = '#24B24A';
    };
    resetButton.onmouseout = () => {
        resetButton.style.background = 'white';
        resetButton.style.borderColor = '#dee2e6';
    };

    // Progress display
    const progressText = document.createElement('span');
    progressText.style.cssText = `
        font-size: 14px;
        color: #6c757d;
        font-weight: 500;
    `;
    progressText.textContent = '0%';

    // Play/Pause functionality
    playButton.addEventListener('click', () => {
        if (isPlaying) {
            // Pause
            isPlaying = false;
            playButton.innerHTML = 'Play';
            if (animationInterval) {
                clearInterval(animationInterval);
                animationInterval = null;
            }
        } else {
            // Play
            isPlaying = true;
            playButton.innerHTML = 'Pause';

            animationInterval = setInterval(() => {
                if (currentMonthIndex >= chartData.total.length - 1) {
                    // Animation complete
                    isPlaying = false;
                    playButton.innerHTML = 'Play';
                    clearInterval(animationInterval);
                    animationInterval = null;
                    return;
                }

                currentMonthIndex++;
                updateChart(currentMonthIndex);

                const progress = Math.round((currentMonthIndex / (chartData.total.length - 1)) * 100);
                progressText.textContent = `${progress}%`;
            }, 50); // 50ms per month for smooth animation
        }
    });

    // Reset functionality
    resetButton.addEventListener('click', () => {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        isPlaying = false;
        playButton.innerHTML = 'Play';
        currentMonthIndex = 0;
        updateChart(0);
        progressText.textContent = '0%';

        // Reset total line to beginning
        linePath.attr('stroke-dashoffset', totalLength);
        areaPath.attr('stroke-dashoffset', totalLength);

        // Reset category lines and areas to beginning
        CATEGORY_ORDER.forEach(category => {
            if (categoryPaths[category] && categoryPathLengths[category]) {
                categoryPaths[category].attr('stroke-dashoffset', categoryPathLengths[category]);
            }
            if (categoryAreaPaths[category] && categoryAreaPathLengths[category]) {
                categoryAreaPaths[category].attr('stroke-dashoffset', categoryAreaPathLengths[category]);
            }
        });

        currentDateLine.style('opacity', 0);
        currentValueText.style('opacity', 0);
    });

    // Append controls
    controlsContainer.appendChild(playButton);
    controlsContainer.appendChild(resetButton);
    controlsContainer.appendChild(progressText);

    // Create category breakdown container
    const categoryBreakdownContainer = document.createElement('div');
    categoryBreakdownContainer.style.cssText = `
        margin-top: 1.5rem;
        padding: 1.5rem;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
    `;

    const breakdownTitle = document.createElement('h3');
    breakdownTitle.textContent = 'Cumulative Breakdown by Category';
    breakdownTitle.style.cssText = `
        margin: 0 0 1rem 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
    `;
    categoryBreakdownContainer.appendChild(breakdownTitle);

    // Create grid for category counts
    const categoryGrid = document.createElement('div');
    categoryGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    `;

    // Create category count elements
    const categoryElements = {};
    CATEGORY_ORDER.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            background: white;
            border-radius: 6px;
            border-left: 4px solid ${getCrimeColor(category)};
        `;

        const categoryColor = document.createElement('div');
        categoryColor.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${getCrimeColor(category)};
            flex-shrink: 0;
        `;

        const categoryInfo = document.createElement('div');
        categoryInfo.style.cssText = `
            flex: 1;
        `;

        const categoryLabel = document.createElement('div');
        categoryLabel.textContent = CATEGORY_LABELS[category];
        categoryLabel.style.cssText = `
            font-size: 13px;
            color: #6c757d;
            margin-bottom: 2px;
        `;

        const categoryCount = document.createElement('div');
        categoryCount.textContent = '0';
        categoryCount.style.cssText = `
            font-size: 20px;
            font-weight: 700;
            color: #111827;
        `;

        categoryInfo.appendChild(categoryLabel);
        categoryInfo.appendChild(categoryCount);
        categoryItem.appendChild(categoryColor);
        categoryItem.appendChild(categoryInfo);
        categoryGrid.appendChild(categoryItem);

        categoryElements[category] = categoryCount;
    });

    categoryBreakdownContainer.appendChild(categoryGrid);

    // Store references for updates
    window.categoryElements = categoryElements;

    // Append to container
    container.appendChild(controlsContainer);
    container.appendChild(svg.node());
    container.appendChild(categoryBreakdownContainer);

    // Initialize at start
    updateChart(0);
}

/**
 * Update the temporal chart (called when filters change)
 */
export function updatetemporal() {
    // Stop any running animation
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    isPlaying = false;
    currentMonthIndex = 0;

    // Re-initialize with current data
    initializetemporal();
}
