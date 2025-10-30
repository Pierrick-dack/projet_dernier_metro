-- db/init/002_seed.sql
-- Ce fichier peut être utilisé pour des données supplémentaires
-- Il est exécuté après le schéma principal

-- Exemple: insertion de données supplémentaires
INSERT INTO stations (name, line) VALUES
('République', 'M3'),
('Nation', 'M1')
ON CONFLICT (name) DO NOTHING;

-- Headways pour les nouvelles stations
INSERT INTO headways (station_id, minutes) 
SELECT id, 4 FROM stations WHERE name = 'République'
ON CONFLICT DO NOTHING;

INSERT INTO headways (station_id, minutes) 
SELECT id, 5 FROM stations WHERE name = 'Nation'
ON CONFLICT DO NOTHING;

-- Last_metro pour les nouvelles stations
INSERT INTO last_metro (station_id, departed_at)
SELECT id, '00:45:00' FROM stations WHERE name = 'République'
ON CONFLICT DO NOTHING;

INSERT INTO last_metro (station_id, departed_at)
SELECT id, '01:00:00' FROM stations WHERE name = 'Nation'
ON CONFLICT DO NOTHING;