document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const username = localStorage.getItem('username');

    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');

    if (token && username) {
        // User is logged in
        authLinks.style.display = 'none';
        userInfo.style.display = 'block';
        usernameDisplay.textContent = username;

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('username');
            window.location.reload();
        });
    } else {
        // User is not logged in
        authLinks.style.display = 'block';
        userInfo.style.display = 'none';
    }
});
