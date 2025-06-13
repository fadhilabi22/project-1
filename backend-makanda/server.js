const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/order');
const contactRoutes = require('./routes/contact');
const productRoutes = require('./routes/products'); // <-- PERBAIKI INI: pastikan nama file adalah 'products.js'

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Serve static files dari folder public
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/products', productRoutes); // <-- PERBAIKI INI: ubah menjadi '/api/products'

// Tangkap semua request lain (deep linking SPA)
app.get('*', (req, res) => {    
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
});
