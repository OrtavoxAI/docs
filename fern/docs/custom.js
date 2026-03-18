/**
 * OrtaVox Fern Docs - Custom JavaScript
 * Auto-expand all sidebar groups for better navigation
 */

(function () {
    'use strict';

    // Function to expand all collapsible sections
    function expandAllSections() {
        // Find all buttons with data-state="closed"
        const closedButtons = document.querySelectorAll('button[data-state="closed"]');

        closedButtons.forEach(button => {
            // Click the button to expand
            button.click();
        });

        // Also find all divs with data-state="closed"
        const closedDivs = document.querySelectorAll('div[data-state="closed"]');

        closedDivs.forEach(div => {
            // Change the state to open
            div.setAttribute('data-state', 'open');
        });

        console.log(`[OrtaVox] Expanded ${closedButtons.length} sections`);
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', expandAllSections);
    } else {
        expandAllSections();
    }

    // Also run after a short delay to catch dynamically loaded content
    setTimeout(expandAllSections, 500);
    setTimeout(expandAllSections, 1000);
    setTimeout(expandAllSections, 2000);

    // Watch for route changes (SPA navigation)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(expandAllSections, 300);
        }
    }).observe(document, { subtree: true, childList: true });

})();
