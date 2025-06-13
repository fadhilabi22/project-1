const express = require('express');
const router = express.Router();
const db = require('../config/db');
const util = require('util');

// Membuat versi promise dari db.query agar bisa dipakai dengan async/await
const query = util.promisify(db.query).bind(db);

// Fungsi helper untuk transaksi database
const beginTransaction = util.promisify(db.beginTransaction).bind(db);
const commit = util.promisify(db.commit).bind(db);
const rollback = util.promisify(db.rollback).bind(db);


// Endpoint submit order menggunakan transaction
router.post('/submit', async (req, res) => {
    const { email, items, total, paymentMethod, shippingDetails } = req.body;
    let initialStatus = 'Menunggu Pembayaran';
    if (paymentMethod) {
        initialStatus = `Menunggu Pembayaran ${paymentMethod.replace(/_/g, ' ').toUpperCase()}`;
    }

    if (!email || !items || items.length === 0 || !total || !paymentMethod) { return res.status(400).json({ message: 'Data order tidak lengkap.' }); }
    if (!shippingDetails || !shippingDetails.name || !shippingDetails.phone || !shippingDetails.addressLine1 || !shippingDetails.district || !shippingDetails.city || !shippingDetails.postalCode) { return res.status(400).json({ message: 'Data alamat pengiriman tidak lengkap.' }); }
    
    const totalAmount = parseInt(String(total).replace(/[Rp.,]/g, '')) || 0;

    try {
        await beginTransaction();

        const orderResults = await query(
            'INSERT INTO orders (user_email, total, created_at, status, payment_method, shipping_name, shipping_phone, shipping_address_line1, shipping_address_line2, shipping_city, shipping_district, shipping_postal_code, shipping_notes) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [email, totalAmount, initialStatus, paymentMethod, shippingDetails.name, shippingDetails.phone, shippingDetails.addressLine1, shippingDetails.addressLine2 || null, shippingDetails.city, shippingDetails.district, shippingDetails.postalCode, shippingDetails.notes || null]
        );
        const orderId = orderResults.insertId;

        for (const item of items) {
            if (!item.name || item.price === undefined || !item.quantity) {
                throw new Error(`Data item tidak lengkap: ${JSON.stringify(item)}`);
            }
            const itemPrice = parseInt(String(item.price).replace(/[Rp.,]/g, '')) || 0;
            const itemQuantity = parseInt(item.quantity);
            
            await query('INSERT INTO order_items (order_id, item_name, item_price, quantity) VALUES (?, ?, ?, ?)', [orderId, item.name, itemPrice, itemQuantity]);
            
            const productRows = await query('SELECT stock FROM products WHERE name = ? FOR UPDATE', [item.name]);
            if (productRows.length === 0) {
                throw new Error(`Produk ${item.name} tidak ditemukan.`);
            }
            
            const currentStock = productRows[0].stock;
            if (currentStock < itemQuantity) {
                throw new Error(`Stok tidak mencukupi untuk ${item.name}.`);
            }
            
            const newStock = currentStock - itemQuantity;
            await query('UPDATE products SET stock = ? WHERE name = ?', [newStock, item.name]);
            
            if (newStock <= 0) {
                await query('UPDATE products SET product_status = "habis" WHERE name = ?', [item.name]);
            }
        }

        await commit();
        res.status(201).json({ message: 'Order berhasil diterima.', orderId: orderId, status: initialStatus });

    } catch (error) {
        await rollback();
        console.error("Kesalahan saat memproses order:", error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan internal.' });
    }
});


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

// Endpoint LAPORAN RIWAYAT SEMUA PELANGGAN TANPA FILTER
router.get('/customer-report/all', async (req, res) => {
    try {
        const sql = `
            SELECT 
                o.id as order_id,
                o.created_at,
                oi.item_name,
                oi.quantity,
                oi.item_price
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            ORDER BY o.created_at DESC;
        `;

        const results = await query(sql);

        if (!results || results.length === 0) {
            return res.status(200).json({
                summary: {
                    totalSpending: 0,
                    totalTransactions: 0,
                    totalItems: 0
                },
                items: []
            });
        }

        const totalSpending = results.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
        const totalItems = results.reduce((sum, item) => sum + item.quantity, 0);
        const totalTransactions = [...new Set(results.map(item => item.order_id))].length;

        res.status(200).json({
            items: results,
            summary: {
                totalSpending,
                totalTransactions,
                totalItems
            }
        });
    } catch (err) {
        console.error("Error fetching all customer report:", err);
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

        if (results.length === 0) {
            return res.status(404).json({ message: `Order dengan ID ${orderId} tidak ditemukan.` });
        }
        
        const orderDetails = mapOrderWithShippingDetails(results[0]);
        res.status(200).json(orderDetails);

    } catch (err) {
        console.error(`Error fetching details for order ${orderId}:`, err);
        res.status(500).json({ message: 'Gagal mengambil detail pesanan dari server.' });
    }
});

// Endpoint untuk update status order (untuk admin)
router.put('/:orderId/status', async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status baru tidak boleh kosong.' });
    }

    try {
        await beginTransaction();

        // JIKA STATUSNYA "Dibatalkan", kembalikan stoknya.
        // Anda bisa menambahkan kondisi lain jika perlu, misal: || status.toLowerCase() === 'gagal'
        if (status.toLowerCase() === 'dibatalkan') {
            // 1. Ambil semua item dari order ini
            const itemsToRestore = await query('SELECT item_name, quantity FROM order_items WHERE order_id = ?', [orderId]);

            if (itemsToRestore.length > 0) {
                // 2. Loop setiap item dan kembalikan stoknya ke tabel products
                for (const item of itemsToRestore) {
                    await query(
                        'UPDATE products SET stock = stock + ?, product_status = "tersedia" WHERE name = ?',
                        [item.quantity, item.item_name]
                    );
                }
            }
        }

        // 3. Setelah stok dikembalikan (jika perlu), baru update status ordernya
        const updateQuery = 'UPDATE orders SET status = ? WHERE id = ?';
        const result = await query(updateQuery, [status, orderId]);

        if (result.affectedRows === 0) {
            await rollback();
            return res.status(404).json({ message: `Order dengan ID ${orderId} tidak ditemukan.` });
        }

        await commit();
        res.status(200).json({ message: `Status order #${orderId} berhasil diubah.` });

    } catch (error) {
        await rollback();
        console.error(`Error updating status for order ${orderId}:`, error);
        res.status(500).json({ message: 'Gagal update status di server.' });
    }
});

// Endpoint untuk hapus satu order beserta semua itemnya
router.delete('/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        await beginTransaction();

        // 1. Ambil dulu semua item di order ini SEBELUM dihapus
        const itemsToRestore = await query('SELECT item_name, quantity FROM order_items WHERE order_id = ?', [orderId]);
        
        // Cek dulu apakah ordernya ada (dilihat dari itemnya)
        if (itemsToRestore.length > 0) {
            // 2. Loop dan kembalikan stok untuk setiap item
            for (const item of itemsToRestore) {
                await query(
                    'UPDATE products SET stock = stock + ?, product_status = "tersedia" WHERE name = ?',
                    [item.quantity, item.item_name]
                );
            }
        }
        
        // 3. Hapus item dari order
        await query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
        
        // 4. Hapus order utamanya
        const deleteOrderResult = await query('DELETE FROM orders WHERE id = ?', [orderId]);

        if (deleteOrderResult.affectedRows === 0) {
            // Jika tidak ada order yang terhapus (mungkin sudah dihapus sebelumnya), rollback saja.
            await rollback();
            return res.status(404).json({ message: `Order dengan ID ${orderId} tidak ditemukan.` });
        }

        await commit();
        res.status(200).json({ message: `Order #${orderId} dan semua itemnya berhasil dihapus. Stok telah dikembalikan.` });

    } catch (err) {
        await rollback();
        console.error(`Gagal menghapus order ${orderId}:`, err);
        res.status(500).json({ message: 'Gagal menghapus pesanan di server.' });
    }
});


// Endpoint untuk hapus 1 item dari order
router.delete('/item/:itemId', async (req, res) => {
    const { itemId } = req.params;

    try {
        await beginTransaction();

        // 1. Ambil detail item yang akan dihapus
        const items = await query('SELECT * FROM order_items WHERE id = ?', [itemId]);
        if (items.length === 0) {
            await rollback();
            return res.status(404).json({ message: 'Item tidak ditemukan.' });
        }
        const itemToDelete = items[0];
        const { order_id, item_price, quantity, item_name } = itemToDelete; // Ambil juga item_name
        const subtotalToDelete = item_price * quantity;

        // 2. Hapus item tersebut dari tabel order_items
        await query('DELETE FROM order_items WHERE id = ?', [itemId]);

        // 3. Update total harga di tabel orders
        await query('UPDATE orders SET total = total - ? WHERE id = ?', [subtotalToDelete, order_id]);
        
        // --- DIUBAH: Mengembalikan stok produk dan mengubah statusnya ---
        // 4. Kembalikan stok produk dan set statusnya menjadi 'tersedia'
        await query(
            'UPDATE products SET stock = stock + ?, product_status = "tersedia" WHERE name = ?', 
            [quantity, item_name]
        );
        // --- AKHIR PERUBAHAN ---

        await commit();
        res.status(200).json({ message: `Item #${itemId} berhasil dihapus dan stok dikembalikan.` });

    } catch (err) {
        await rollback();
        console.error(`Gagal menghapus item ${itemId}:`, err);
        res.status(500).json({ message: 'Gagal menghapus item di server.' });
    }
});


// pdf
const PDFDocument = require("pdfkit");

// Endpoint: Export PDF laporan riwayat semua pelanggan
router.get('/customer-report/pdf', async (req, res) => {
    try {
        const sql = `
            SELECT 
                o.id AS order_id,
                o.created_at,
                oi.item_name,
                oi.item_price,
                oi.quantity
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            ORDER BY o.created_at DESC;
        `;

        const results = await query(sql);

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=laporan_riwayat.pdf");
        doc.pipe(res);

        const formatRupiah = (val) => "Rp" + Number(val).toLocaleString("id-ID");
        const formatDate = (val) => {
            const d = new Date(val);
            return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth()+1).toString().padStart(2, "0")}-${d.getFullYear()}`;
        };

        doc.fontSize(16).font("Helvetica-Bold").text("LAPORAN RIWAYAT PEMBELIAN", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Dicetak pada: ${formatDate(new Date())}`, { align: "center" });
        doc.moveDown();

        const tableTop = doc.y + 10;
        const rowHeight = 20;
        const colWidths = [30, 70, 150, 60, 60, 100];
        const headers = ["No", "Tanggal", "Nama Item", "Qty", "Harga", "Subtotal"];

        let x = 50;
        headers.forEach((header, i) => {
            doc
                .rect(x, tableTop, colWidths[i], rowHeight)
                .fillAndStroke("#f0f0f0", "black")
                .fillColor("black")
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(header, x + 2, tableTop + 6, {
                    width: colWidths[i] - 4,
                    align: "center"
                });
            x += colWidths[i];
        });

        let y = tableTop + rowHeight;
        let total = 0;
        let no = 1;

        for (const item of results) {
            const subtotal = item.item_price * item.quantity;
            total += subtotal;

            const row = [
                no,
                formatDate(item.created_at),
                item.item_name,
                item.quantity,
                formatRupiah(item.item_price),
                formatRupiah(subtotal)
            ];

            x = 50;
            row.forEach((val, i) => {
                doc
                    .rect(x, y, colWidths[i], rowHeight)
                    .stroke()
                    .font("Helvetica")
                    .fontSize(9)
                    .fillColor("black")
                    .text(String(val), x + 2, y + 6, {
                        width: colWidths[i] - 4,
                        align: i === row.length - 1 ? "right" : "center"
                    });
                x += colWidths[i];
            });

            y += rowHeight;
            if (y + rowHeight > doc.page.height - 50) {
                doc.addPage();
                y = 50;
            }

            no++;
        }

        // TOTAL
        doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .text(`Total Belanja: ${formatRupiah(total)}`, 400, y + 20, { align: "right" });

        doc.end();
    } catch (err) {
        console.error("Gagal generate PDF riwayat:", err);
        res.status(500).json({ message: 'Gagal membuat PDF laporan.' });
    }
});

module.exports = router;