// my ROUTING KEPT BUGGING AND IDK WHY I HAD TO SK CHATGPT FOR HELP FOR THIS
const Router = {
  init: function() {
    this.handleCurrentURL();
    this.setupNavigationHandlers();
  },

  // Handle the current URL and redirect if necessary
  handleCurrentURL: function() {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;

    // Check if we're on a directory path that should be an HTML file
    const pathMappings = {
      '/profile/': '/profile.html',
      '/profile': '/profile.html',
      '/events/': '/events.html',
      '/events': '/events.html',
      '/venues/': '/venues.html',
      '/venues': '/venues.html',
      '/create-venue/': '/create-venue.html',
      '/create-venue': '/create-venue.html',
      '/dashboard/': '/dashboard.html',
      '/dashboard': '/dashboard.html',
      '/login/': '/login.html',
      '/login': '/login.html',
      '/signup/': '/signup.html',
      '/signup': '/signup.html',
      '/confirm/': '/confirm.html',
      '/confirm': '/confirm.html',
      '/profile-setup/': '/profile-setup.html',
      '/profile-setup': '/profile-setup.html',
      '/event-details/': '/event-details.html',
      '/event-details': '/event-details.html'
    };

    // Check if current path needs redirection
    if (pathMappings[currentPath]) {
      const newURL = pathMappings[currentPath] + (currentHash || '');
      console.log(' Redirecting from', currentPath, 'to', newURL);
      window.location.replace(newURL);
      return;
    }

    // Handle root directory redirects
    const segments = currentPath.split('/').filter(segment => segment.length > 0);
    if (segments.length === 1) {
      const pageName = segments[0];
      const validPages = ['profile', 'events', 'venues', 'create-venue', 'dashboard', 'login', 'signup', 'confirm', 'profile-setup', 'event-details'];

      if (validPages.includes(pageName)) {
        const newURL = `/${pageName}.html` + (currentHash || '');
        console.log(' Redirecting from', currentPath, 'to', newURL);
        window.location.replace(newURL);
        return;
      }
    }
  },

  // Setup click handlers for navigation links
  setupNavigationHandlers: function() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');

      // Only handle internal navigation links
      if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) {
        return;
      }

      // Ensure we're navigating to .html files
      if (!href.includes('.html') && href !== '/' && href !== './') {
        event.preventDefault();

        // Add .html extension if missing
        let targetURL = href;
        if (!targetURL.endsWith('/')) {
          targetURL += '.html';
        } else {
          // Remove trailing slash and add .html
          targetURL = targetURL.slice(0, -1) + '.html';
        }

        console.log(' Navigation intercepted:', href, '→', targetURL);
        window.location.href = targetURL;
      }
    });
  },

  // Navigate to a page programmatically
  navigate: function(page) {
    if (!page.includes('.html')) {
      page += '.html';
    }
    window.location.href = page;
  },

  // Get current page name without extension
  getCurrentPage: function() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    return filename.replace('.html', '') || 'index';
  },

  // Check if we're on a specific page
  isCurrentPage: function(pageName) {
    return this.getCurrentPage() === pageName;
  }
};

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Router.init());
} else {
  Router.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Router;
}
