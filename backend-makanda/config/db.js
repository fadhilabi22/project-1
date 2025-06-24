// db.js (versi aman dan profesional)

// Muat variabel dari file .env ke dalam process.env
// Baris ini hanya perlu untuk development di lokal
require('dotenv').config(); 

const mysql = require('mysql2');

// Ambil konfigurasi dari environment variables
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error menghubungkan ke MySQL:', err);
        throw err;
    }
    console.log('Terhubung ke MySQL');
});

module.exports = db;