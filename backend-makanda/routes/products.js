const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Sesuaikan path jika db.js Anda ada di tempat lain

// GET semua produk (untuk admin dan menu publik)
router.get('/all', (req, res) => {
    db.query('SELECT id, name, category, price, image_url, description, stock, product_status FROM products ORDER BY name ASC', (err, results) => {
        if (err) {
            console.error("Kesalahan saat mengambil semua produk:", err);
            return res.status(500).json({ message: 'Gagal mengambil data produk.' });
        }
        res.status(200).json({ products: results });
    });
});

// PUT perbarui stok produk
router.put('/:productId/stock', (req, res) => {
    const { productId } = req.params;
    const { newStock } = req.body;

    if (newStock === undefined || isNaN(parseInt(newStock)) || parseInt(newStock) < 0) {
        return res.status(400).json({ message: 'Nilai stok baru tidak valid.' });
    }

    const stockValue = parseInt(newStock);
    const newStatus = stockValue > 0 ? 'tersedia' : 'habis'; // Status otomatis diperbarui berdasarkan stok

    db.query(
        'UPDATE products SET stock = ?, product_status = ? WHERE id = ?',
        [stockValue, newStatus, productId],
        (err, results) => {
            if (err) {
                console.error(`Kesalahan saat memperbarui stok untuk produk ${productId}:`, err);
                return res.status(500).json({ message: 'Gagal memperbarui stok produk.' });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Produk tidak ditemukan.' });
            }
            res.status(200).json({ message: `Stok produk berhasil diperbarui menjadi ${stockValue}. Status otomatis diperbarui menjadi ${newStatus}.`, newStock: stockValue, newStatus: newStatus });
        }
    );
});

// PUT perbarui status produk
router.put('/:productId/status', (req, res) => {
    const { productId } = req.params;
    const { newStatus } = req.body; // 'tersedia' atau 'habis'

    if (!newStatus || !['tersedia', 'habis'].includes(newStatus)) {
        return res.status(400).json({ message: 'Status baru tidak valid. Gunakan "tersedia" atau "habis".' });
    }

    let query = 'UPDATE products SET product_status = ? WHERE id = ?';
    let queryParams = [newStatus, productId];

    // Jika status 'habis', set juga stok menjadi 0
    // Jika status 'tersedia', stok tetap (admin harus mengaturnya manual jika sebelumnya 0)
    if (newStatus === 'habis') {
        query = 'UPDATE products SET product_status = ?, stock = 0 WHERE id = ?';
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error(`Kesalahan saat memperbarui status untuk produk ${productId}:`, err);
            return res.status(500).json({ message: 'Gagal memperbarui status produk.' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Produk tidak ditemukan.' });
        }
        let responseMessage = `Status produk berhasil diperbarui menjadi ${newStatus}.`;
        if (newStatus === 'habis') {
            responseMessage += ` Stok otomatis diperbarui menjadi 0.`;
        }
        res.status(200).json({ message: responseMessage, newStatus: newStatus, stockUpdated: newStatus === 'habis' });
    });
});

module.exports = router;