const express = require('express');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/order');
const contactRoutes = require('./routes/contact');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ REGISTER ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/products', productRoutes);

// Untuk SPA frontend (jika ada)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Jalankan server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server jalan di port${PORT}`);
});