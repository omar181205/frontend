const API_URL = 'http://localhost:5000';

const signupForm = document.getElementById('signupForm');
const errorMessage = document.getElementById('errorMessage');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    if (!name || !email || !password || !role) {
        showError('Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    if (!isStrongPassword(password)) {
        showError('Password must be at least 8 characters with uppercase, lowercase, number and special character');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = 'login.html';
        } else {
            showError(data.message || 'Signup failed');
        }
    } catch (error) {
        showError('Connection error. Please try again.');
    }
});

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isStrongPassword(password) {
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return passRegex.test(password);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}
