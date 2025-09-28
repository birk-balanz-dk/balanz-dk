// Simple cookie consent banner
function initCookieConsent() {
    // Check if user has already consented
    if (localStorage.getItem('cookieConsent')) {
        loadStatCounter();
        return;
    }

    // Create banner HTML
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML = `
        <div style="position: fixed; bottom: 0; left: 0; right: 0; background: #2d3748; color: white; padding: 16px; z-index: 1000; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 14px;">
                Vi bruger cookies til at analysere hvordan siden bruges. 
                <a href="/privacy.html" style="color: #a8c4d0; text-decoration: underline;">Læs mere</a>
            </p>
            <button onclick="acceptCookies()" style="background: #7B9B7D; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-right: 8px; cursor: pointer;">
                Accepter
            </button>
            <button onclick="rejectCookies()" style="background: transparent; color: white; border: 1px solid white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                Afvis
            </button>
        </div>
    `;
    
    document.body.appendChild(banner);
}

function acceptCookies() {
    localStorage.setItem('cookieConsent', 'accepted');
    document.getElementById('cookie-banner').remove();
    loadStatCounter();
}

function rejectCookies() {
    localStorage.setItem('cookieConsent', 'rejected');
    document.getElementById('cookie-banner').remove();
}

function loadStatCounter() {
    // Only load StatCounter if consent was given
    if (localStorage.getItem('cookieConsent') === 'accepted') {
        // Add your StatCounter code here when you get it
        // Load StatCounter script
var sc_project=13169788; 
var sc_invisible=1; 
var sc_security="053d0dd1";
var script = document.createElement('script');
script.type = 'text/javascript';
script.src = 'https://www.statcounter.com/counter/counter.js';
script.async = true;
document.head.appendChild(script);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initCookieConsent);