"use strict";
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// --- Configuration via variables d'environnement ---
const HEADWAY_MIN = parseInt(process.env.HEADWAY_MIN) || 3;
const LAST_WINDOW_START = process.env.LAST_WINDOW_START || "00:45";
const SERVICE_END = process.env.SERVICE_END || "01:15";

// Liste de stations simulées
const STATIONS = [
	"Chatelet", "Gare de Lyon", "Concorde", "Bastille",
	"Opera", "Pyramides", "Pont Neuf", "Louvre", "Hotel de Ville"
];

// --- Middleware logs ---
app.use((req, res, next) => {
	const start = Date.now();
	res.on("finish", () => {
		const duration = Date.now() - start;
		console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
	});
	next();
});

app.use(express.json());

// --- Utils ---
function parseHHMM(str, now) {
	const [h, m] = str.split(":").map(Number);
	const d = new Date(now);
	d.setHours(h, m, 0, 0);
	if (d < now) d.setDate(d.getDate() + 1); // lendemain si passé
	return d;
}

function getNextArrivals(now = new Date(), count = 1) {
	const toHHMM = d => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");

	const startService = new Date(now);
	startService.setHours(5, 30, 0, 0);

	const endService = parseHHMM(SERVICE_END, now);
	const lastWindow = parseHHMM(LAST_WINDOW_START, now);

	if (now < startService || now > endService) return { service: "closed", tz: "Europe/Paris" };

	const arrivals = [];
	for (let i = 0; i < count; i++) {
		const nextTime = new Date(now.getTime() + HEADWAY_MIN * 60 * 1000 * (i + 1));
		arrivals.push({
			nextArrival: toHHMM(nextTime),
			isLast: nextTime >= lastWindow && nextTime <= endService
		});
	}

	return { arrivals, headwayMin: HEADWAY_MIN, tz: "Europe/Paris" };
}

function suggestStations(query) {
	if (!query) return [];
	const q = query.toLowerCase();
	return STATIONS.filter(s => s.toLowerCase().includes(q));
}

// --- Routes ---
app.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

app.get("/next-metro", (req, res) => {
	const station = req.query.station;
	const n = Math.min(Math.max(parseInt(req.query.n) || 1, 1), 5); // n entre 1 et 5

	if (!station) return res.status(400).json({ error: "missing station" });

	if (!STATIONS.includes(station)) {
		const suggestions = suggestStations(station);
		return res.status(404).json({ error: "unknown station", suggestions });
	}

	const now = new Date();
	const metroData = getNextArrivals(now, n);

	if (metroData.service === "closed") return res.status(200).json({ service: "closed", tz: metroData.tz });

	const response = {
		station,
		line: "M7",
		headwayMin: metroData.headwayMin,
		tz: metroData.tz
	};

	if (n === 1) {
		response.nextArrival = metroData.arrivals[0].nextArrival;
		response.isLast = metroData.arrivals[0].isLast;
	} else {
		response.arrivals = metroData.arrivals;
	}

	res.status(200).json(response);
});

// --- Catch-all 404 ---
app.use((req, res) => res.status(404).json({ error: "not found" }));

// --- Lancer le serveur ---
app.listen(port, () => {
	console.log(`Dernier Metro API lancé sur le port ${port}`);
	console.log(`Config: HEADWAY_MIN=${HEADWAY_MIN}, LAST_WINDOW_START=${LAST_WINDOW_START}, SERVICE_END=${SERVICE_END}`);
});
