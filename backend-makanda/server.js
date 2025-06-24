const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/order');
const contactRoutes = require('./routes/contact');
const productRoutes = require('./routes/products');

const app = express();
// PERBAIKAN #1: Gunakan port dari environment variable Railway
const PORT = process.env.PORT || 3000;

// Middleware
// (Catatan: bodyParser.json() sudah ada di express.json() di versi Express baru, tapi ini tetap berfungsi)
app.use(bodyParser.json());

// PERBAIKAN #2: Perbaiki path ke folder 'public'
// Ini akan menyajikan file seperti user2.jpg dari root URL
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/products', productRoutes);

// Tangkap semua request lain dan arahkan ke index.html (untuk Single Page Application)
app.get('*', (req, res) => {    
    // PERBAIKAN #2: Perbaiki path ke index.html juga
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => { // Tambahkan '0.0.0.0' agar bisa diakses dari luar container
    console.log(`Server jalan di port ${PORT}`);
});