-- db/init/001_schema.sql
-- ========================================
-- Création de la table des stations
-- ========================================
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    line VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des stations valides
INSERT INTO stations (name, line) VALUES
('Chatelet', 'M7'),
('Gare de Lyon', 'M7'),
('Concorde', 'M7'),
('Bastille', 'M7'),
('Opera', 'M7'),
('Pyramides', 'M7'),
('Pont Neuf', 'M7'),
('Louvre', 'M7'),
('Hotel de Ville', 'M7')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- Création de la table des headways
-- ========================================
CREATE TABLE IF NOT EXISTS headways (
    id SERIAL PRIMARY KEY,
    station_id INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    minutes INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des headways correspondants aux stations
INSERT INTO headways (station_id, minutes) VALUES
(1, 5),
(2, 6),
(3, 5),
(4, 7),
(5, 6),
(6, 5),
(7, 8),
(8, 5),
(9, 6)
ON CONFLICT DO NOTHING;

-- ========================================
-- Création de la table last_metro
-- ========================================
CREATE TABLE IF NOT EXISTS last_metro (
    id SERIAL PRIMARY KEY,
    station_id INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    departed_at TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des données last_metro
INSERT INTO last_metro (station_id, departed_at) VALUES
(1, '01:15:00'),
(2, '01:10:00'),
(3, '01:05:00'),
(4, '01:20:00'),
(5, '01:25:00'),
(6, '01:30:00'),
(7, '01:35:00'),
(8, '01:40:00'),
(9, '01:45:00')
ON CONFLICT DO NOTHING;