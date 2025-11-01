/**
 * TABS.JS - Handle tab switching between Crime Map and Metrics
 *
 * Simple tab navigation - switches between the map view and metrics view
 */

// Set up tab switching
export function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all buttons and tabs
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding tab
            button.classList.add('active');

            if (tabName === 'crimeMap') {
                document.getElementById('crimeMapTab').classList.add('active');
            } else if (tabName === 'metrics') {
                document.getElementById('metricsTab').classList.add('active');
            }
        });
    });
}
