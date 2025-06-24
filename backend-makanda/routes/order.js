const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');

const query = util.promisify(db.query).bind(db);
const beginTransaction = util.promisify(db.beginTransaction).bind(db);
const commit = util.promisify(db.commit).bind(db);
const rollback = util.promisify(db.rollback).bind(db);

// Endpoint submit order - DENGAN PENJAGA TRANSAKSI
router.post('/submit', async (req, res) => {
    const { email, items, total, paymentMethod, shippingDetails } = req.body;
    // ... (validasi input tidak berubah)
    if (!email || !items || items.length === 0 || !total || !paymentMethod || !shippingDetails) { 
        return res.status(400).json({ message: 'Data order atau pengiriman tidak lengkap.' }); 
    }
    
    const totalAmount = parseInt(String(total).replace(/[Rp.,]/g, '')) || 0;
    let transactionCompleted = false; // Flag untuk menandai transaksi sudah selesai

    try {
        await beginTransaction();

        // PENAMBAHAN: Handler untuk membatalkan transaksi jika koneksi klien terputus
        req.on('close', () => {
            if (!transactionCompleted) {
                console.log('Koneksi klien terputus saat submit, transaksi dibatalkan.');
                rollback();
            }
        });

        const orderResults = await query(
            'INSERT INTO orders (user_email, total, created_at, status, payment_method, shipping_name, shipping_phone, shipping_address_line1, shipping_address_line2, shipping_city, shipping_district, shipping_postal_code, shipping_notes) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [email, totalAmount, `Menunggu Pembayaran ${paymentMethod.replace(/_/g, ' ').toUpperCase()}`, paymentMethod, shippingDetails.name, shippingDetails.phone, shippingDetails.addressLine1, shippingDetails.addressLine2 || null, shippingDetails.city, shippingDetails.district, shippingDetails.postalCode, shippingDetails.notes || null]
        );
        const orderId = orderResults.insertId;

        for (const item of items) {
            // ... (logika loop tidak berubah)
            const itemPrice = parseInt(String(item.price).replace(/[Rp.,]/g, '')) || 0;
            const itemQuantity = parseInt(item.quantity);
            
            await query('INSERT INTO order_items (order_id, item_name, item_price, quantity) VALUES (?, ?, ?, ?)', [orderId, item.name, itemPrice, itemQuantity]);
            
            const productRows = await query('SELECT stock FROM products WHERE name = ? FOR UPDATE', [item.name]);
            if (productRows.length === 0) throw new Error(`Produk ${item.name} tidak ditemukan.`);
            
            const currentStock = productRows[0].stock;
            if (currentStock < itemQuantity) throw new Error(`Stok tidak mencukupi untuk ${item.name}.`);
            
            const newStock = currentStock - itemQuantity;
            await query('UPDATE products SET stock = ? WHERE name = ?', [newStock, item.name]);
        }

        await commit();
        transactionCompleted = true; // Tandai transaksi berhasil selesai
        res.status(201).json({ message: 'Order berhasil diterima.', orderId: orderId });

    } catch (error) {
        if (!transactionCompleted) {
            await rollback();
            transactionCompleted = true; // Tandai transaksi gagal selesai
        }
        console.error("Kesalahan saat memproses order:", error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan internal.' });
    }
});

// Endpoint update status order - DENGAN PENJAGA TRANSAKSI
router.put('/:orderId/status', async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: 'Status baru tidak boleh kosong.' });

    let transactionCompleted = false;

    try {
        await beginTransaction();

        // PENAMBAHAN: Handler untuk koneksi terputus
        req.on('close', () => {
            if (!transactionCompleted) {
                console.log(`Koneksi klien terputus saat update status order #${orderId}, transaksi dibatalkan.`);
                rollback();
            }
        });

        // Jika statusnya dibatalkan, kembalikan stok
        if (status.toLowerCase() === 'dibatalkan') {
            const itemsToRestore = await query('SELECT item_name, quantity FROM order_items WHERE order_id = ?', [orderId]);
            for (const item of itemsToRestore) {
                await query('UPDATE products SET stock = stock + ? WHERE name = ?', [item.quantity, item.item_name]);
            }
        }

        const result = await query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        if (result.affectedRows === 0) throw new Error(`Order dengan ID ${orderId} tidak ditemukan.`);

        await commit();
        transactionCompleted = true;
        res.status(200).json({ message: `Status order #${orderId} berhasil diubah.` });

    } catch (error) {
        if (!transactionCompleted) {
            await rollback();
            transactionCompleted = true;
        }
        console.error(`Error updating status for order ${orderId}:`, error);
        res.status(500).json({ message: error.message || 'Gagal update status di server.' });
    }
});

// Endpoint untuk hapus satu order - DENGAN PENJAGA TRANSAKSI
router.delete('/:orderId', async (req, res) => {
    const { orderId } = req.params;
    let transactionCompleted = false;

    try {
        await beginTransaction();

        // PENAMBAHAN: Handler untuk koneksi terputus
        req.on('close', () => {
            if (!transactionCompleted) {
                console.log(`Koneksi klien terputus saat hapus order #${orderId}, transaksi dibatalkan.`);
                rollback();
            }
        });

        const itemsToRestore = await query('SELECT item_name, quantity FROM order_items WHERE order_id = ?', [orderId]);
        for (const item of itemsToRestore) {
            await query('UPDATE products SET stock = stock + ? WHERE name = ?', [item.quantity, item.item_name]);
        }
        
        await query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
        const deleteOrderResult = await query('DELETE FROM orders WHERE id = ?', [orderId]);

        if (deleteOrderResult.affectedRows === 0) throw new Error(`Order dengan ID ${orderId} tidak ditemukan.`);

        await commit();
        transactionCompleted = true;
        res.status(200).json({ message: `Order #${orderId} berhasil dihapus.` });

    } catch (err) {
        if (!transactionCompleted) {
            await rollback();
            transactionCompleted = true;
        }
        console.error(`Gagal menghapus order ${orderId}:`, err);
        res.status(500).json({ message: err.message || 'Gagal menghapus pesanan di server.' });
    }
});


// Endpoint untuk hapus 1 item dari order - DENGAN PENJAGA TRANSAKSI
router.delete('/item/:itemId', async (req, res) => {
    const { itemId } = req.params;
    let transactionCompleted = false;

    try {
        await beginTransaction();
        
        // PENAMBAHAN: Handler untuk koneksi terputus
        req.on('close', () => {
            if (!transactionCompleted) {
                console.log(`Koneksi klien terputus saat hapus item #${itemId}, transaksi dibatalkan.`);
                rollback();
            }
        });

        const items = await query('SELECT * FROM order_items WHERE id = ?', [itemId]);
        if (items.length === 0) throw new Error('Item tidak ditemukan.');
        
        const { order_id, item_price, quantity, item_name } = items[0];
        const subtotalToDelete = item_price * quantity;

        await query('DELETE FROM order_items WHERE id = ?', [itemId]);
        await query('UPDATE orders SET total = total - ? WHERE id = ?', [subtotalToDelete, order_id]);
        await query('UPDATE products SET stock = stock + ? WHERE name = ?', [quantity, item_name]);

        await commit();
        transactionCompleted = true;
        res.status(200).json({ message: `Item #${itemId} berhasil dihapus dan stok dikembalikan.` });

    } catch (err) {
        if (!transactionCompleted) {
            await rollback();
            transactionCompleted = true;
        }
        console.error(`Gagal menghapus item ${itemId}:`, err);
        res.status(500).json({ message: err.message || 'Gagal menghapus item di server.' });
    }
});


// --- Endpoint lain yang tidak melakukan transaksi pada tabel products tidak perlu diubah ---

// Helper function untuk mem-parse alamat dari hasil query
const mapOrderWithShippingDetails = (order) => {
    const itemIds = order.item_ids ? order.item_ids.split('|') : [];
    const itemNames = order.item_names ? order.item_names.split('|') : [];
    const itemPrices = order.item_prices ? order.item_prices.split('|') : [];
    const itemQuantities = order.item_quantities ? order.item_quantities.split('|') : [];
    const items = itemIds.map((id, index) => ({ id: id, name: itemNames[index] || 'Nama tidak tersedia', price: parseInt(itemPrices[index] || 0), quantity: parseInt(itemQuantities[index] || 1) }));
    return { id: order.id, user_email: order.user_email, total: order.total, created_at: order.created_at, status: order.status, payment_method: order.payment_method, items: items, shipping_details: { name: order.shipping_name, phone: order.shipping_phone, address_line1: order.shipping_address_line1, address_line2: order.shipping_address_line2, city: order.shipping_city, district: order.shipping_district, postal_code: order.shipping_postal_code, notes: order.shipping_notes } };
};

// Endpoint untuk mengambil history order user
router.get('/history/:email', async (req, res) => {
    const { email } = req.params;
    try {
        const sql = `SELECT o.id, o.user_email, o.total, o.created_at, o.status, o.payment_method, o.shipping_name, o.shipping_phone, o.shipping_address_line1, o.shipping_address_line2, o.shipping_city, o.shipping_district, o.shipping_postal_code, o.shipping_notes, GROUP_CONCAT(oi.id SEPARATOR '|') as item_ids, GROUP_CONCAT(oi.item_name SEPARATOR '|') as item_names, GROUP_CONCAT(oi.item_price SEPARATOR '|') as item_prices, GROUP_CONCAT(oi.quantity SEPARATOR '|') as item_quantities FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id WHERE o.user_email = ? GROUP BY o.id ORDER BY o.created_at DESC`;
        const results = await query(sql, [email]);
        const orders = results.map(mapOrderWithShippingDetails);
        res.status(200).json({ orders });
    } catch (err) {
        console.error("Error fetching order history:", err);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil riwayat pesanan.' });
    }
});

// Endpoint /all DENGAN LOGIKA PAGINASI
router.get('/all', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const offset = (page - 1) * limit;

        const countResult = await query('SELECT COUNT(*) as totalOrders FROM orders');
        const totalOrders = countResult[0].totalOrders;
        const totalPages = Math.ceil(totalOrders / limit);

        const dataQuery = `
            SELECT o.id, o.user_email, o.total, o.created_at, o.status, o.payment_method,
                   o.shipping_name, o.shipping_phone, o.shipping_address_line1, o.shipping_address_line2, 
                   o.shipping_city, o.shipping_district, o.shipping_postal_code, o.shipping_notes,
                   GROUP_CONCAT(oi.id SEPARATOR '|') as item_ids,
                   GROUP_CONCAT(oi.item_name SEPARATOR '|') as item_names,
                   GROUP_CONCAT(oi.item_price SEPARATOR '|') as item_prices,
                   GROUP_CONCAT(oi.quantity SEPARATOR '|') as item_quantities
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ?
            OFFSET ?`;
        
        const results = await query(dataQuery, [limit, offset]);
        const orders = results.map(mapOrderWithShippingDetails);
        
        res.status(200).json({
            orders,
            totalPages,
            currentPage: page
        });
    } catch (err) {
        console.error("Error fetching paginated orders for admin:", err);
        res.status(500).json({ message: 'Gagal mengambil data pesanan dari server.' });
    }
});

// Endpoint Laporan Riwayat Pelanggan dengan Filter
router.get('/customer-report', async (req, res) => {
    const { year, month } = req.query;

    try {
        let sql = `
            SELECT 
                o.id as order_id, o.created_at, oi.item_name, oi.quantity, oi.item_price
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
        `;
        const params = [];
        const whereClauses = [];
        if (year && !isNaN(year)) { whereClauses.push('YEAR(o.created_at) = ?'); params.push(parseInt(year)); }
        if (month && !isNaN(month)) { whereClauses.push('MONTH(o.created_at) = ?'); params.push(parseInt(month)); }
        if (whereClauses.length > 0) { sql += ' WHERE ' + whereClauses.join(' AND '); }
        sql += ' ORDER BY o.created_at DESC;';

        const results = await query(sql, params);
        if (!results) { return res.status(200).json({ summary: { totalSpending: 0, totalTransactions: 0, totalItems: 0 }, items: [] }); }

        const totalSpending = results.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
        const totalItems = results.reduce((sum, item) => sum + item.quantity, 0);
        const totalTransactions = [...new Set(results.map(item => item.order_id))].length;
        res.status(200).json({ items: results, summary: { totalSpending, totalTransactions, totalItems } });
    } catch (err) {
        console.error("Error fetching customer report:", err);
        res.status(500).json({ message: 'Gagal mengambil data laporan dari server.' });
    }
});

// Endpoint untuk mengambil detail order spesifik
router.get('/:orderId/details', async (req, res) => {
    const { orderId } = req.params;
    try {
        const sql = `
            SELECT 
                o.id, o.user_email, o.total, o.created_at, o.status, o.payment_method,
                o.shipping_name, o.shipping_phone, o.shipping_address_line1, o.shipping_address_line2, 
                o.shipping_city, o.shipping_district, o.shipping_postal_code, o.shipping_notes,
                GROUP_CONCAT(oi.id SEPARATOR '|') as item_ids,
                GROUP_CONCAT(oi.item_name SEPARATOR '|') as item_names,
                GROUP_CONCAT(oi.item_price SEPARATOR '|') as item_prices,
                GROUP_CONCAT(oi.quantity SEPARATOR '|') as item_quantities
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
            GROUP BY o.id;
        `;
        const results = await query(sql, [orderId]);
        if (results.length === 0) return res.status(404).json({ message: `Order dengan ID ${orderId} tidak ditemukan.` });
        
        const orderDetails = mapOrderWithShippingDetails(results[0]);
        res.status(200).json(orderDetails);
    } catch (err) {
        console.error(`Error fetching details for order ${orderId}:`, err);
        res.status(500).json({ message: 'Gagal mengambil detail pesanan dari server.' });
    }
});

// Endpoint ambil semua produk dengan paginasi (untuk admin)
router.get('/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const offset = (page - 1) * limit;

        const countResult = await query('SELECT COUNT(*) as total FROM products');
        const totalProducts = countResult[0].total;
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await query(
            'SELECT id, name, category, price, image_url, description, stock, product_status FROM products ORDER BY name ASC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        res.status(200).json({
            products,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        console.error("Gagal mengambil data produk:", err);
        res.status(500).json({ message: 'Gagal mengambil data produk.' });
    }
});
// --- ENDPOINT PRODUK TAMBAHAN (ADMIN) ---

// Update stok produk
router.put('/products/:productId/stock', async (req, res) => {
    const { productId } = req.params;
    const { newStock } = req.body;

    if (newStock === undefined || isNaN(parseInt(newStock)) || parseInt(newStock) < 0) {
        return res.status(400).json({ message: 'Nilai stok baru tidak valid.' });
    }

    try {
        const stockValue = parseInt(newStock);
        const newStatus = stockValue > 0 ? 'tersedia' : 'habis';

        const result = await query(
            'UPDATE products SET stock = ?, product_status = ? WHERE id = ?',
            [stockValue, newStatus, productId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produk tidak ditemukan.' });
        }

        res.status(200).json({
            message: `Stok produk berhasil diperbarui menjadi ${stockValue}. Status otomatis diperbarui menjadi ${newStatus}.`,
            newStock: stockValue,
            newStatus
        });
    } catch (err) {
        console.error(`Gagal update stok produk ${productId}:`, err);
        res.status(500).json({ message: 'Gagal memperbarui stok produk.' });
    }
});

// Update status produk (tersedia / habis)
router.put('/products/:productId/status', async (req, res) => {
    const { productId } = req.params;
    const { newStatus } = req.body;

    if (!newStatus || !['tersedia', 'habis'].includes(newStatus)) {
        return res.status(400).json({ message: 'Status tidak valid. Gunakan "tersedia" atau "habis".' });
    }

    try {
        let sql = 'UPDATE products SET product_status = ? WHERE id = ?';
        const params = [newStatus, productId];

        if (newStatus === 'habis') {
            sql = 'UPDATE products SET product_status = ?, stock = 0 WHERE id = ?';
        }

        const result = await query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produk tidak ditemukan.' });
        }

        res.status(200).json({
            message: `Status produk berhasil diperbarui menjadi ${newStatus}.`,
            newStatus,
            stockUpdated: newStatus === 'habis'
        });
    } catch (err) {
        console.error(`Gagal update status produk ${productId}:`, err);
        res.status(500).json({ message: 'Gagal memperbarui status produk.' });
    }
});




module.exports = router;