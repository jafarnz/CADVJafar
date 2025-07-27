document.addEventListener('DOMContentLoaded', () => {
    // Use current authentication system
    const isAuthenticated = Utils && Utils.isAuthenticated ? Utils.isAuthenticated() : false;
    const userData = Utils && Utils.getUserFromToken ? Utils.getUserFromToken() : null;

    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');

    if (isAuthenticated && userData) {
        // User is logged in
        if (authLinks) authLinks.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (usernameDisplay) usernameDisplay.textContent = userData.preferredUsername || userData.username || 'User';

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (Utils && Utils.logout) {
                    Utils.logout();
                } else {
                    // Fallback logout
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('id_token');
                    localStorage.removeItem('user_data');
                    window.location.href = 'index.html';
                }
            });
        }
    } else {
        // User is not logged in
        if (authLinks) authLinks.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
    }
});
