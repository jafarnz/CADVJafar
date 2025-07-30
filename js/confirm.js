const apiUrl = 'https://dxotswm9sh.execute-api.us-east-1.amazonaws.com';

document.addEventListener('DOMContentLoaded', () => {
    const confirmForm = document.getElementById('confirm-form');
    const messageDiv = document.getElementById('message');
    const usernameInput = document.getElementById('username');

    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    if (username) {
        usernameInput.value = username;
    }

    if (confirmForm) {
        confirmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(confirmForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${apiUrl}/auth/confirm_signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    messageDiv.style.color = 'green';
                    messageDiv.textContent = 'Account confirmed successfully! Redirecting to login...';
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    messageDiv.style.color = 'red';
                    messageDiv.textContent = result.message || 'Invalid confirmation code.';
                }
            } catch (error) {
                messageDiv.style.color = 'red';
                messageDiv.textContent = 'An error occurred. Please try again.';
                console.error('Error:', error);
            }
        });
    }
});
