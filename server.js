"use strict";
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const fs = require("fs");
const yaml = require("js-yaml");


const app = express();
const port = process.env.PORT || 3000;

// Charger le fichier openapi.yaml
const swaggerDocument = yaml.load(fs.readFileSync("./openapi/openapi.yaml", "utf8"));

const db = require("./db/database.js");

// Exemple route qui lit la DB
app.get("/stations", async (req, res) => {
	try {
		const result = await db.query("SELECT * FROM stations;");
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Erreur serveur" });
	}
});


// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// Exemple de route
app.get("/", (req, res) => {
	res.send("Hello depuis Docker 🚀");
});


// Configuration via variables d'environnement
const HEADWAY_MIN = parseInt(process.env.HEADWAY_MIN) || 3;
const LAST_WINDOW_START = process.env.LAST_WINDOW_START || "00:45";
const SERVICE_END = process.env.SERVICE_END || "01:15";

// Middleware logs
app.use((req, res, next) => {
	const start = Date.now();
	res.on("finish", () => {
		const duration = Date.now() - start;
		console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
	});
	next();
});

app.use(express.json());

// Utils
function parseHHMM(str, now) {
	const [h, m] = str.split(":").map(Number);
	const d = new Date(now);
	d.setHours(h, m, 0, 0);
	if (d < now) d.setDate(d.getDate() + 1);
	return d;
}

// Fonction de calcul des prochains métros avec headway personnalisé
function getNextArrivals(now = new Date(), count = 1, headwayMin = 3) {
	const tz = 'Europe/Paris';
	const toHHMM = d => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");

	// Définir les plages horaires (vous pouvez aussi les mettre en base si besoin)
	const startService = new Date(now);
	startService.setHours(5, 30, 0, 0);

	const endService = parseHHMM(SERVICE_END, now);
	const lastWindow = parseHHMM(LAST_WINDOW_START, now);

	if (now < startService || now > endService) {
		return { service: "closed", tz };
	}

	// Calculer les N prochaines arrivées avec le headway spécifique
	const arrivals = [];
	for (let i = 0; i < count; i++) {
		const nextTime = new Date(now.getTime() + headwayMin * 60 * 1000 * (i + 1));
		arrivals.push({
			nextArrival: toHHMM(nextTime),
			isLast: nextTime >= lastWindow && nextTime <= endService
		});
	}

	return {
		arrivals,
		headwayMin: headwayMin, // Utiliser le headway passé en paramètre
		tz
	};
}


// Fonction pour obtenir les suggestions de stations depuis la base
async function suggestStations(query) {
	if (!query) return [];
	try {
		const result = await db.query(  // ⬅️ REMPLACER pool PAR db
			"SELECT name FROM stations WHERE name ILIKE $1 LIMIT 5",
			[`%${query}%`]
		);
		return result.rows.map(row => row.name);
	} catch (error) {
		console.error("Erreur lors de la recherche de stations:", error);
		return [];
	}
}

// ========================================
// Routes
// ========================================

// Route pour health
app.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});



// Route pour /next-metro
app.get("/next-metro", async (req, res) => {
	const station = req.query.station;
	const n = Math.min(Math.max(parseInt(req.query.n) || 1, 1), 5);

	if (!station) return res.status(400).json({ error: "missing station" });

	try {
		// Récupérer la station ET son headway depuis la table headways
		const stationResult = await db.query(  // ⬅️ REMPLACER pool PAR db
			`SELECT s.name, s.line, h.minutes 
       FROM stations s 
       JOIN headways h ON s.id = h.station_id 
       WHERE s.name = $1`,
			[station]
		);

		if (stationResult.rows.length === 0) {
			const suggestions = await suggestStations(station);
			return res.status(404).json({ error: "unknown station", suggestions });
		}

		const stationData = stationResult.rows[0];
		const stationHeadway = stationData.minutes;

		const now = new Date();
		const metroData = getNextArrivals(now, n, stationHeadway);

		if (metroData.service === "closed")
			return res.status(200).json({ service: "closed", tz: metroData.tz });

		const response = {
			station: stationData.name,
			line: stationData.line,
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
	} catch (error) {
		console.error("Erreur base de données:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});



// Route pour /last-metro
app.get('/last-metro', async (req, res) => {
	const station = (req.query.station || '').toString().trim();
	if (!station) {
		return res.status(400).json({ error: "missing station" });
	}

	try {
		const result = await db.query(  // ⬅️ REMPLACER dbPool PAR db
			'SELECT s.name, l.departed_at FROM stations s JOIN last_metro l ON s.id=l.station_id WHERE s.name=$1',
			[station]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({
				error: "station not found",
				code: "STATION_NOT_FOUND",
				station
			});
		}

		return res.status(200).json({
			station: result.rows[0].name,
			departed_at: result.rows[0].departed_at
		});
	} catch (err) {
		console.error('DB error:', err);
		return res.status(500).json({ error: "database error" });
	}
});



// Route de diagnostic
app.get("/debug-db", async (req, res) => {
	try {
		const stations = await db.query("SELECT * FROM stations");
		const headways = await db.query("SELECT * FROM headways");

		res.json({
			stations: stations.rows,
			headways: headways.rows,
			totalStations: stations.rows.length,
			totalHeadways: headways.rows.length
		});
	} catch (error) {
		console.error("Erreur debug:", error);
		res.status(500).json({ error: error.message });
	}
});



// Catch-all 404
app.use((req, res) => res.status(404).json({ error: "not found" }));

// Lancer le serveur
app.listen(port, () => {
	console.log(`Dernier Metro API lancé sur le port ${port}`);
	console.log(`Config: HEADWAY_MIN=${HEADWAY_MIN}, LAST_WINDOW_START=${LAST_WINDOW_START}, SERVICE_END=${SERVICE_END}`);
	console.log(`📖 Swagger dispo sur http://localhost:${port}/api-docs`);
});