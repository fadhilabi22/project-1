// main.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#loginForm');
    const registerForm = document.querySelector('#registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted'); // Debug
            const email = document.querySelector('#loginEmail').value.trim();
            const password = document.querySelector('#loginPassword').value.trim();
            console.log('Login data:', { email, password }); // Debug

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                alert(data.message || 'Login berhasil!');
            } catch (error) {
                console.error('Error login:', error);
                alert('Terjadi kesalahan saat login. Coba lagi atau periksa konsol untuk detail.');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Register form submitted'); // Debug
            const email = document.querySelector('#registerEmail').value.trim();
            const password = document.querySelector('#registerPassword').value.trim();
            const confirmPassword = document.querySelector('#registerConfirmPassword').value.trim();
            console.log('Register data:', { email, password, confirmPassword }); // Debug

            if (password !== confirmPassword) {
                alert('Password dan konfirmasi password tidak cocok!');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                alert(data.message || 'Registrasi berhasil!');
            } catch (error) {
                console.error('Error registrasi:', error);
                alert('Terjadi kesalahan saat registrasi. Coba lagi atau periksa konsol untuk detail.');
            }
        });
    }

    document.querySelectorAll('.login-btn, .register-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetModalId = button.getAttribute('data-target');
            if (targetModalId) {
                const modal = document.querySelector(targetModalId);
                if (modal) {
                    modal.style.display = 'block';
                }
            }
        });
    });

    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', () => {
            const modal = close.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
});