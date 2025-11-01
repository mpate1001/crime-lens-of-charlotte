/**
 * UTILS.JS - Helper functions used throughout the app
 *
 * Just a bunch of useful functions for formatting dates, categorizing crimes,
 * showing tooltips, etc. Nothing fancy, just practical stuff.
 */

import { CRIME_CATEGORIES, CATEGORY_COLORS, ELEMENT_IDS } from './config.js';

// Format a date nicely for display (e.g., "Oct 12, 2017")
export function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(+date)) return '';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Convert different date formats into a proper Date object
// Handles timestamps from CSV (like "1507766400000") or date strings
export function parseDate(value) {
    if (!value && value !== 0) return null;

    // If it's already a number, easy
    if (typeof value === 'number') {
        return new Date(value);
    }

    // CSV gives us timestamps as strings, so try converting to number first
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue > 0) {
        return new Date(numValue);
    }

    // Otherwise try parsing as a date string
    const d = new Date(value);
    return Number.isNaN(+d) ? null : d;
}

// Figure out what category a crime belongs to by checking keywords
export function getCrimeCategory(description) {
    if (!description) return 'other';

    const desc = String(description).toUpperCase();

    // Loop through categories and see if any keywords match
    for (const [category, keywords] of Object.entries(CRIME_CATEGORIES)) {
        for (const keyword of keywords) {
            if (desc.includes(keyword.toUpperCase())) {
                return category;
            }
        }
    }

    return 'other';  // If nothing matches
}

// Get the color for a crime category
export function getCrimeColor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

// Show a tooltip near the mouse cursor
export function showTooltip(event, html) {
    const tooltip = d3.select('#' + ELEMENT_IDS.tooltip);
    if (!tooltip.node()) return;

    tooltip.html(html).attr('aria-hidden', 'false');

    const { innerWidth: w, innerHeight: h } = window;
    const bbox = tooltip.node().getBoundingClientRect();

    // Keep tooltip on screen (don't let it go off the edge)
    const x = Math.min(event.pageX + 10, w - bbox.width - 10);
    const y = Math.min(event.pageY - 10, h - bbox.height - 10);

    tooltip
        .style('left', x + 'px')
        .style('top', y + 'px');
}

// Hide the tooltip
export function hideTooltip() {
    d3.select('#' + ELEMENT_IDS.tooltip).attr('aria-hidden', 'true');
}

// Show a "no data" message when filters return nothing
export function renderEmptyMessage(containerSelector, message) {
    const root = d3.select(containerSelector);
    if (!root.node()) return;

    root.selectAll('*').remove();
    root.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('height', '100%')
        .style('color', '#6c757d')
        .style('font-size', '16px')
        .text(message);
}

// Debounce - prevents a function from running too often
// Useful for zoom/pan events so we don't lag the map
export function debounce(fn, wait = 150) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    };
}

// Try multiple field names to get a property value
// The API data sometimes has inconsistent field names (ZIP vs zip vs zipcode)
export function getPropertyValue(properties, ...keys) {
    for (const key of keys) {
        if (properties[key] !== undefined && properties[key] !== null) {
            return properties[key];
        }
    }
    return null;
}
