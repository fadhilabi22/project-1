// routes/payment.js
const express = require('express');
const router = express.Router();
const axios = require('axios'); // Untuk membuat HTTP request ke endpoint order.js

// Endpoint untuk memproses pembayaran
router.post('/process', async (req, res) => {
    const {
        orderItems, // Array item dari cart di menu.html
        totalAmount, // Total harga dari menu.html
        paymentMethod, // Metode pembayaran dari menu.html
        customerEmail // Email customer dari menu.html
    } = req.body;

    // 1. Validasi input dasar
    if (!orderItems || !totalAmount || !paymentMethod || !customerEmail) {
        return res.status(400).json({ message: "Data pembayaran tidak lengkap." });
    }

    // 2. Simulasi Proses Pembayaran (misalnya dengan payment gateway)
    // Di dunia nyata, di sini ada integrasi dengan Midtrans, Xendit, dll.
    // Untuk sekarang, kita anggap pembayaran selalu berhasil.
    console.log(`Memulai proses pembayaran untuk ${customerEmail} sebesar Rp${totalAmount} via ${paymentMethod}`);
    const paymentSuccessful = true; // Simulasi keberhasilan

    if (paymentSuccessful) {
        console.log("Pembayaran berhasil disimulasikan.");

        // 3. Persiapkan data untuk dikirim ke endpoint /api/order/submit
        // Sesuaikan dengan format yang dibutuhkan oleh order.js
        const orderDataForSubmit = {
            email: customerEmail,
            items: orderItems.map(item => ({
                name: item.name,
                // Harga dari orderItems di menu.html sudah berupa angka bersih (tanpa Rp.)
                price: item.price.toString() // order.js mengharapkan string yang akan di-parse lagi
            })),
            total: totalAmount
        };

        try {
            // 4. Panggil endpoint /api/order/submit yang ada di order.js
            // Pastikan URL ini sesuai dengan bagaimana server utama Anda menjalankan endpoint order
            // Jika payment.js dan order.js berjalan di server yang sama, localhost adalah benar.
            const submitOrderResponse = await axios.post(
                `http://localhost:${process.env.PORT || 3000}/api/order/submit`, // Sesuaikan port jika perlu
                orderDataForSubmit,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (submitOrderResponse.status === 201) {
                console.log("Order berhasil dikirim ke endpoint /api/order/submit:", submitOrderResponse.data.message);
                // Kirim respons sukses kembali ke frontend (menu.html)
                return res.status(200).json({
                    message: "Pembayaran berhasil dan pesanan telah dicatat!",
                    orderDetails: submitOrderResponse.data // atau data custom
                });
            } else {
                // Jika endpoint order mengembalikan status error
                console.error("Gagal menyimpan order melalui /api/order/submit:", submitOrderResponse.data);
                return res.status(submitOrderResponse.status).json({
                    message: "Pembayaran berhasil, tetapi gagal menyimpan pesanan.",
                    error: submitOrderResponse.data.message || "Kesalahan internal pada sistem order."
                });
            }
        } catch (error) {
            console.error("Error saat memanggil /api/order/submit:", error.response ? error.response.data : error.message);
            // Tangani error network atau jika endpoint order tidak bisa dijangkau
            let errorMessage = "Terjadi kesalahan saat menghubungi layanan order.";
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
            return res.status(500).json({
                message: "Pembayaran berhasil, namun terjadi kesalahan internal saat mencatat pesanan.",
                error: errorMessage
            });
        }
    } else {
        console.log("Simulasi pembayaran gagal.");
        return res.status(402).json({ message: "Pembayaran gagal diproses." }); // HTTP 402 Payment Required (atau status lain yang sesuai)
    }
});

module.exports = router;