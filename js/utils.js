import { CRIME_CATEGORIES, CATEGORY_COLORS, ELEMENT_IDS } from './config.js';

export function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(+date)) return '';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function parseDate(value) {
    if (!value && value !== 0) return null;

    if (typeof value === 'number') {
        return new Date(value);
    }

    const numValue = Number(value);
    if (!isNaN(numValue) && numValue > 0) {
        return new Date(numValue);
    }

    const d = new Date(value);
    return Number.isNaN(+d) ? null : d;
}

export function getCrimeCategory(description) {
    if (!description) return 'other';

    const desc = String(description).toUpperCase();

    for (const [category, keywords] of Object.entries(CRIME_CATEGORIES)) {
        for (const keyword of keywords) {
            if (desc.includes(keyword.toUpperCase())) {
                return category;
            }
        }
    }

    return 'other';
}

export function getCrimeColor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

export function showTooltip(event, html) {
    const tooltip = d3.select('#' + ELEMENT_IDS.tooltip);
    if (!tooltip.node()) return;

    tooltip.html(html).attr('aria-hidden', 'false');

    const { innerWidth: w, innerHeight: h } = window;
    const bbox = tooltip.node().getBoundingClientRect();

    const x = Math.min(event.pageX + 10, w - bbox.width - 10);
    const y = Math.min(event.pageY - 10, h - bbox.height - 10);

    tooltip
        .style('left', x + 'px')
        .style('top', y + 'px');
}

export function hideTooltip() {
    d3.select('#' + ELEMENT_IDS.tooltip).attr('aria-hidden', 'true');
}

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

export function debounce(fn, wait = 150) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    };
}

export function getPropertyValue(properties, ...keys) {
    for (const key of keys) {
        if (properties[key] !== undefined && properties[key] !== null) {
            return properties[key];
        }
    }
    return null;
}
