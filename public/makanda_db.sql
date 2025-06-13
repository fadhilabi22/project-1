-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 29 Bulan Mei 2025 pada 07.57
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `makanda_db`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `admin_users`
--

CREATE TABLE `admin_users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nama` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `contacts`
--

CREATE TABLE `contacts` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `contacts`
--

INSERT INTO `contacts` (`id`, `name`, `email`, `message`, `created_at`) VALUES
(1, 'Fadhil abi untoro', 'fadhil@gmail.com', 'adada', '2025-05-23 13:53:31'),
(2, 'Indonesia', 'fadhilabiuntoro@gmail.co', 'yayayayayayyaadada', '2025-05-23 13:53:50'),
(3, 'Fadhil abi untoro', 'fadhil@gmail.com', 'jadi gini anda tau gorlok', '2025-05-27 09:26:10');

-- --------------------------------------------------------

--
-- Struktur dari tabel `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_email` varchar(255) DEFAULT NULL,
  `total` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(100) DEFAULT 'Menunggu Pembayaran',
  `payment_method` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `orders`
--

INSERT INTO `orders` (`id`, `user_email`, `total`, `created_at`, `status`, `payment_method`) VALUES
(1, NULL, 45000, '2025-05-23 11:26:40', 'Menunggu Pembayaran', NULL),
(2, NULL, 18000, '2025-05-23 11:29:41', 'Menunggu Pembayaran', NULL),
(3, NULL, 45000, '2025-05-23 11:54:23', 'Menunggu Pembayaran', NULL),
(4, NULL, 110000, '2025-05-23 12:00:16', 'Menunggu Pembayaran', NULL),
(5, NULL, 18000, '2025-05-23 12:12:57', 'Menunggu Pembayaran', NULL),
(6, NULL, 65000, '2025-05-23 13:16:03', 'Menunggu Pembayaran', NULL),
(12, 'adada@gmail.com', 65000, '2025-05-23 14:15:45', 'Menunggu Pembayaran', NULL),
(13, 'fadhilabiuntoro@gmail.com', 65000, '2025-05-23 14:21:49', 'Selesai', NULL),
(22, 'fadhil@gmail.com', 45000, '2025-05-28 13:52:10', 'Selesai', 'bca_va'),
(23, 'fadhil@gmail.com', 45000, '2025-05-29 01:52:37', 'Selesai', 'mandiri_va'),
(24, 'fadhil@gmail.com', 45000, '2025-05-29 02:00:26', 'Selesai', 'mandiri_va');

-- --------------------------------------------------------

--
-- Struktur dari tabel `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `item_name` varchar(255) DEFAULT NULL,
  `item_price` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `item_name`, `item_price`) VALUES
(1, 1, 'Bawang Goreng Spicy (300ml)', 45000),
(2, 2, 'Ice Matcha Latte', 18000),
(3, 3, 'Bawang Goreng Spicy (300ml)', 45000),
(4, 4, 'Bawang Goreng Original (500ml)', 65000),
(5, 4, 'Bawang Goreng Spicy (300ml)', 45000),
(6, 5, 'Ice Matcha Latte', 18000),
(7, 6, 'Bawang Goreng Spicy (500ml)', 65000),
(14, 12, 'Bawang Goreng Original (500ml)', 65000),
(15, 13, 'Bawang Goreng Original (500ml)', 65000),
(23, 22, 'Bawang Goreng Original (300ml)', 45000),
(24, 23, 'Bawang Goreng Original (300ml)', 45000),
(25, 24, 'Bawang Goreng Original (300ml)', 45000);

-- --------------------------------------------------------

--
-- Struktur dari tabel `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `stock` int(11) DEFAULT 0,
  `product_status` varchar(50) DEFAULT 'tersedia' COMMENT 'Contoh: tersedia, habis'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `price`, `category`, `image_url`, `stock`, `product_status`) VALUES
(1, 'Bawang Goreng Original (300ml)', 'Bawang Goreng premium rasa original ukuran 300ml.', 45000.00, 'makanan-utama', 'img/bawang.jpg', 50, 'tersedia'),
(2, 'Bawang Goreng Spicy (300ml)', 'Bawang Goreng premium rasa pedas ukuran 300ml.', 48000.00, 'makanan-utama', 'img/bawang.jpg', 30, 'tersedia'),
(3, 'Bawang Goreng Original (500ml)', 'Bawang Goreng premium rasa original ukuran 500ml.', 65000.00, 'makanan-utama', 'img/bawang.jpg', 40, 'tersedia'),
(4, 'Bawang Goreng Spicy (500ml)', 'Bawang Goreng premium rasa pedas ukuran 500ml.', 68000.00, 'makanan-utama', 'img/bawang.jpg', 25, 'tersedia'),
(5, 'Es Teh Manis', 'Teh manis dingin yang menyegarkan hari kamu.', 5000.00, 'minuman', 'img/es-teh.jpg', 100, 'tersedia'),
(6, 'Ice Matcha Latte', 'Matcha premium dengan susu segar dan es batu.', 18000.00, 'minuman', 'img/matcha.jpg', 50, 'tersedia');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(10) NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'fadhil@gmail.com', '$2b$10$aWlow1XYAseicx0/OCab9OKoK7zAta0gwCsvZJ8J9kGl/3iiowNQK', 'user', '2025-05-23 11:13:49'),
(2, 'dafi@gmail.com', '$2b$10$uAf9KNQ3ySucvEbvfo6jmeYmanS44hOO7N0Xxq5N6orIlcrd10QbC', 'user', '2025-05-27 09:51:04'),
(3, 'fadhilabi@gmail.com', '$2b$10$HK.UsqOS8yDpsZrmCi3VgOeLjuX50XOmcUPZcGiE/HXRXiWot5ZgS', 'admin', '2025-05-28 13:07:13');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indeks untuk tabel `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indeks untuk tabel `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT untuk tabel `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT untuk tabel `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
