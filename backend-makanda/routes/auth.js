const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan password diperlukan.' });
    }
    // Tambahkan validasi email sederhana jika perlu
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Format email tidak valid.' });
    }
    if (password.length < 6) { // Contoh validasi panjang password
        return res.status(400).json({ message: 'Password minimal 6 karakter.' });
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    // Role akan default 'user' karena definisi di database
    db.query(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, hashedPassword],
        (err, results) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Email sudah terdaftar' });
                }
                console.error("Error saat registrasi:", err);
                return res.status(500).json({ message: 'Terjadi kesalahan internal saat registrasi' });
            }
            res.status(201).json({ message: 'Registrasi berhasil. Silakan login.' });
        }
    );
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;  

    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan password diperlukan.' });
    }

    db.query(
        // Ambil juga kolom role
        'SELECT id, email, password, role FROM users WHERE email = ?',
        [email],
        async (err, results) => {
            if (err) {
                console.error("Error saat login query:", err);
                return res.status(500).json({ message: 'Terjadi kesalahan internal' });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: 'Email tidak ditemukan' });
            }

            const user = results[0];
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.status(401).json({ message: 'Password salah' });
            }

            // Kirim role bersama dengan pesan sukses
            res.status(200).json({ 
                message: 'Login berhasil', 
                userId: user.id, // Mungkin berguna nanti
                email: user.email,
                role: user.role // KIRIM ROLE KE FRONTEND
            });
        }
    );
});

module.exports = router;