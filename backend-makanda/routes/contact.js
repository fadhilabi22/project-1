const express = require('express');
const router = express.Router();
const db = require('../config/db');  // koneksi database mysql kamu

router.post('/', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }

  const sql = 'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)';
  db.query(sql, [name, email, message], (err, results) => {
    if (err) {
      console.error('Error simpan pesan kontak:', err);
      return res.status(500).json({ message: 'Gagal menyimpan pesan' });
    }

    res.status(201).json({ message: 'Pesan berhasil dikirim' });
  });
});

module.exports = router;
