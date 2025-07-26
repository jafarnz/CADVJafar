const apiUrl = 'https://dxotswm9sh.execute-api.us-east-1.amazonaws.com';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('message');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${apiUrl}/auth/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Redirect to the confirmation page, passing the username as a query parameter
                    const username = data.username;
                    window.location.href = `confirm.html?username=${encodeURIComponent(username)}`;
                } else {
                    messageDiv.style.color = 'red';
                    messageDiv.textContent = result.message || 'An error occurred during sign up.';
                }
            } catch (error) {
                messageDiv.style.color = 'red';
                messageDiv.textContent = 'An error occurred. Please try again.';
                console.error('Error:', error);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${apiUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    localStorage.setItem('jwt_token', result.token);
                    localStorage.setItem('username', data.username);
                    window.location.href = 'index.html';
                } else {
                    messageDiv.style.color = 'red';
                    messageDiv.textContent = result.message || 'Invalid username or password.';
                }
            } catch (error) {
                messageDiv.style.color = 'red';
                messageDiv.textContent = 'An error occurred. Please try again.';
                console.error('Error:', error);
            }
        });
    }
});
