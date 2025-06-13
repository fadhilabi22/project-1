const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',         // sesuaikan user MySQL kamu
    password: '',         // sesuaikan password MySQL kamu
    database: 'makanda_db'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Terhubung ke MySQL');
});

module.exports = db;