/**
 * TREEMAP.JS - Zoomable treemap for crime type distribution
 *
 * Shows crime categories in a treemap layout where you can click to zoom in
 * and see the breakdown of specific crime types within each category.
 */

import { state } from './state.js';
import { CATEGORY_ORDER, CATEGORY_LABELS, CRIME_CATEGORIES } from './config.js';
import { getCrimeColor } from './utils.js';

// Create the zoomable treemap
export function renderCrimeTreemap() {
    const container = document.getElementById('metricCrimeTypes');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Prepare the data in hierarchy format
    const treemapData = prepareTreemapData();

    // Set dimensions
    const width = container.clientWidth || 800;
    const height = 600;

    // Custom tiling function for aspect ratio when zoomed
    function tile(node, x0, y0, x1, y1) {
        d3.treemapBinary(node, 0, 0, width, height);
        for (const child of node.children) {
            child.x0 = x0 + child.x0 / width * (x1 - x0);
            child.x1 = x0 + child.x1 / width * (x1 - x0);
            child.y0 = y0 + child.y0 / height * (y1 - y0);
            child.y1 = y0 + child.y1 / height * (y1 - y0);
        }
    }

    // Compute the layout
    const hierarchy = d3.hierarchy(treemapData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    const root = d3.treemap().tile(tile)(hierarchy);

    // Create scales
    const x = d3.scaleLinear().rangeRound([0, width]);
    const y = d3.scaleLinear().rangeRound([0, height]);

    // Format numbers
    const format = d3.format(",d");
    const name = d => d.ancestors().reverse().map(d => d.data.name).join("/");

    // Create SVG
    const svg = d3.create("svg")
        .attr("viewBox", [0.5, -40.5, width, height + 40])
        .attr("width", width)
        .attr("height", height + 40)
        .style("max-width", "100%")
        .style("height", "auto")
        .style("font", "11px sans-serif");

    // Display the root
    let group = svg.append("g")
        .call(render, root);

    // Render function
    function render(group, root) {
        const node = group
            .selectAll("g")
            .data(root.children.concat(root))
            .join("g");

        // Make nodes clickable
        node.filter(d => d === root ? d.parent : d.children)
            .attr("cursor", "pointer")
            .on("click", (event, d) => d === root ? zoomout(root) : zoomin(d));

        // Add tooltips
        node.append("title")
            .text(d => `${name(d)}\n${format(d.value)} incidents`);

        // Add rectangles
        node.append("rect")
            .attr("id", d => {
                d.leafUid = `leaf-${Math.random().toString(36).substr(2, 9)}`;
                return d.leafUid;
            })
            .attr("fill", d => {
                if (d === root) return "#fff";
                if (d.children) {
                    // Parent category - use category color
                    return getCrimeColor(d.data.category);
                }
                // Leaf node - lighter shade of parent color
                const parentColor = getCrimeColor(d.parent.data.category);
                return d3.color(parentColor).brighter(0.3);
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        // Add clip paths for text
        node.append("clipPath")
            .attr("id", d => {
                d.clipUid = `clip-${Math.random().toString(36).substr(2, 9)}`;
                return d.clipUid;
            })
            .append("use")
            .attr("href", d => `#${d.leafUid}`);

        // Add text labels
        node.append("text")
            .attr("clip-path", d => d.clipUid)
            .attr("font-weight", d => d === root ? "bold" : null)
            .selectAll("tspan")
            .data(d => {
                if (d === root) {
                    // Root/breadcrumb: don't split, just show as single line
                    return [name(d)];
                } else {
                    // Regular boxes: split by capital letters and add count
                    return d.data.name.split(/(?=[A-Z][^A-Z])/g).concat(format(d.value));
                }
            })
            .join("tspan")
            .attr("x", 3)
            .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
            .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
            .attr("font-weight", (d, i, nodes) => i === nodes.length - 1 ? "normal" : null)
            .text(d => d);

        group.call(position, root);
    }

    // Position elements
    function position(group, root) {
        group.selectAll("g")
            .attr("transform", d => d === root ? `translate(0,-40)` : `translate(${x(d.x0)},${y(d.y0)})`)
            .select("rect")
            .attr("width", d => d === root ? width : x(d.x1) - x(d.x0))
            .attr("height", d => d === root ? 40 : y(d.y1) - y(d.y0));
    }

    // Zoom in
    function zoomin(d) {
        const group0 = group.attr("pointer-events", "none");
        const group1 = group = svg.append("g").call(render, d);

        x.domain([d.x0, d.x1]);
        y.domain([d.y0, d.y1]);

        svg.transition()
            .duration(750)
            .call(t => group0.transition(t).remove()
                .call(position, d.parent))
            .call(t => group1.transition(t)
                .attrTween("opacity", () => d3.interpolate(0, 1))
                .call(position, d));
    }

    // Zoom out
    function zoomout(d) {
        const group0 = group.attr("pointer-events", "none");
        const group1 = group = svg.insert("g", "*").call(render, d.parent);

        x.domain([d.parent.x0, d.parent.x1]);
        y.domain([d.parent.y0, d.parent.y1]);

        svg.transition()
            .duration(750)
            .call(t => group0.transition(t).remove()
                .attrTween("opacity", () => d3.interpolate(1, 0))
                .call(position, d))
            .call(t => group1.transition(t)
                .call(position, d.parent));
    }

    // Append to container
    container.appendChild(svg.node());
}

// Prepare data in hierarchical format for treemap
function prepareTreemapData() {
    // Count incidents by crime type (use all data, not filtered)
    const crimeTypeCounts = {};

    state.data.incidents.forEach(incident => {
        const type = incident.type || 'Unknown';
        crimeTypeCounts[type] = (crimeTypeCounts[type] || 0) + 1;
    });

    // Build hierarchy: root -> categories -> specific crime types
    const children = [];

    CATEGORY_ORDER.forEach(category => {
        const categoryChildren = [];
        const crimes = CRIME_CATEGORIES[category] || [];

        // Add each specific crime type that has incidents
        crimes.forEach(crimeType => {
            const count = crimeTypeCounts[crimeType] || 0;
            if (count > 0) {
                categoryChildren.push({
                    name: crimeType,
                    value: count,
                    category: category
                });
            }
        });

        // Only add category if it has crimes
        if (categoryChildren.length > 0) {
            children.push({
                name: CATEGORY_LABELS[category],
                category: category,
                children: categoryChildren
            });
        }
    });

    return {
        name: "Crime Types",
        children: children
    };
}
