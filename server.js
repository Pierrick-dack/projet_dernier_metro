"use strict";
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// Configuration via variables d'environnement (Défi A)
const HEADWAY_MIN = parseInt(process.env.HEADWAY_MIN) || 3;
const LAST_WINDOW_START = process.env.LAST_WINDOW_START || "00:45";
const SERVICE_END = process.env.SERVICE_END || "01:15";

// Liste des stations valides (Défi C)
const VALID_STATIONS = [
	"Chatelet", "Gare de Lyon", "Concorde", "Bastille",
	"Opera", "Pyramides", "Pont Neuf", "Louvre", "Hotel de Ville"
];

// Middleware pour les logs
app.use((req, res, next) => {
	const start = Date.now();
	res.on('finish', () => {
		const duration = Date.now() - start;
		console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
	});
	next();
});

// Middleware pour les réponses JSON
app.use(express.json());

// Fonction utilitaire pour parser HH:MM en objet Date
function parseTimeString(timeStr, now) {
	const [hours, minutes] = timeStr.split(':').map(Number);
	const time = new Date(now);
	time.setHours(hours, minutes, 0, 0);

	// Si l'heure est avant l'heure actuelle, on suppose que c'est pour le lendemain
	if (time < now) {
		time.setDate(time.getDate() + 1);
	}

	return time;
}

// Fonction de calcul des prochains métros (Défi A et B)
function nextArrivals(now = new Date(), n = 1) {
	const tz = 'Europe/Paris';
	const toHM = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

	// Définir les plages horaires avec les variables d'environnement
	const startService = new Date(now);
	startService.setHours(5, 30, 0, 0); // 05:30

	const endService = parseTimeString(SERVICE_END, now);
	const lastWindow = parseTimeString(LAST_WINDOW_START, now);

	// Vérifier si le service est fermé
	if (now < startService || now > endService) {
		return { service: "closed", tz };
	}

	// Calculer les N prochaines arrivées
	const arrivals = [];
	for (let i = 0; i < n; i++) {
		const nextTime = new Date(now.getTime() + HEADWAY_MIN * 60 * 1000 * (i + 1));
		arrivals.push({
			nextArrival: toHM(nextTime),
			isLast: nextTime >= lastWindow && nextTime <= endService
		});
	}

	return {
		arrivals,
		headwayMin: HEADWAY_MIN,
		tz
	};
}

// Fonction de suggestion de stations (Défi C)
function findStationSuggestions(input) {
	if (!input) return [];

	const lowerInput = input.toLowerCase();
	return VALID_STATIONS.filter(station =>
		station.toLowerCase().includes(lowerInput)
	);
}

// Route health
app.get('/health', (req, res) => {
	res.status(200).json({ status: "ok" });
});

// Route next-metro (avec tous les défis implémentés)
app.get('/next-metro', (req, res) => {
	const station = req.query.station;
	const n = Math.min(Math.max(parseInt(req.query.n) || 1, 1), 5); // Défi B: limiter n entre 1 et 5

	if (!station) {
		return res.status(400).json({ error: "missing station" });
	}

	// Défi C: Validation de la station
	if (!VALID_STATIONS.includes(station)) {
		const suggestions = findStationSuggestions(station);
		return res.status(404).json({
			error: "unknown station",
			suggestions
		});
	}

	const now = new Date();
	const metroData = nextArrivals(now, n);

	if (metroData.service === "closed") {
		return res.status(200).json({ service: "closed", tz: metroData.tz });
	}

	// Préparer la réponse en fonction du nombre d'arrivées demandé
	const response = {
		station: station,
		line: "M7",
		headwayMin: metroData.headwayMin,
		tz: metroData.tz
	};

	if (n === 1) {
		// Format rétrocompatible avec le MVP
		response.nextArrival = metroData.arrivals[0].nextArrival;
		response.isLast = metroData.arrivals[0].isLast;
	} else {
		// Format étendu pour N arrivées
		response.arrivals = metroData.arrivals;
	}

	res.status(200).json(response);
});

// Gestion des routes non trouvées
app.use((req, res) => {
	res.status(404).json({ error: "Not found" });
});

// Démarrage du serveur
app.listen(port, () => {
	console.log(`Dernier Metro API listening on port ${port}`);
	console.log(`Configuration: HEADWAY_MIN=${HEADWAY_MIN}, LAST_WINDOW_START=${LAST_WINDOW_START}, SERVICE_END=${SERVICE_END}`);
});