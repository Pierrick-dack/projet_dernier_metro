"use strict";
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const fs = require("fs");
const yaml = require("js-yaml");
const db = require("../db/database.js");

const app = express();
app.use(express.json());

// Charger le fichier openapi.yaml
const swaggerDocument = yaml.load(fs.readFileSync("./openapi/openapi.yaml", "utf8"));

// Middleware de logs
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Utils
function parseHHMM(str, now) {
  const [h, m] = str.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d < now) d.setDate(d.getDate() + 1);
  return d;
}

function getNextArrivals(now = new Date(), count = 1, headwayMin = 3) {
  const tz = "Europe/Paris";
  const toHHMM = d =>
    String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");

  const startService = new Date(now);
  startService.setHours(5, 30, 0, 0);

  const endService = parseHHMM(process.env.SERVICE_END || "01:15", now);
  const lastWindow = parseHHMM(process.env.LAST_WINDOW_START || "00:45", now);

  if (now < startService || now > endService) {
    return { service: "closed", tz };
  }

  const arrivals = [];
  for (let i = 0; i < count; i++) {
    const nextTime = new Date(now.getTime() + headwayMin * 60 * 1000 * (i + 1));
    arrivals.push({
      nextArrival: toHHMM(nextTime),
      isLast: nextTime >= lastWindow && nextTime <= endService,
    });
  }

  return { arrivals, headwayMin, tz };
}

async function suggestStations(query) {
  if (!query) return [];
  try {
    const result = await db.query(
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
// ROUTES
// ========================================

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/db-health", async (req, res) => {
  try {
    console.log('Tentative de connexion DB avec:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER
    });
    
    await db.query("SELECT 1");
    console.log('✅ Connexion DB réussie');
    res.status(200).json({ db: "ok" });
  } catch (error) {
    console.error('❌ Erreur DB:', error.message);
    res.status(500).json({ error: "database unavailable" });
  }
});

app.get("/next-metro", async (req, res) => {
  const station = req.query.station;
  const n = Math.min(Math.max(parseInt(req.query.n) || 1, 1), 5);
  if (!station) return res.status(400).json({ error: "missing station" });

  try {
    const stationResult = await db.query(
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
      tz: metroData.tz,
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

app.get("/last-metro", async (req, res) => {
  const station = (req.query.station || "").toString().trim();
  if (!station) return res.status(400).json({ error: "missing station" });

  try {
    const result = await db.query(
      "SELECT s.name, l.departed_at FROM stations s JOIN last_metro l ON s.id=l.station_id WHERE s.name=$1",
      [station]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "station not found",
        code: "STATION_NOT_FOUND",
        station,
      });
    }

    return res.status(200).json({
      station: result.rows[0].name,
      departed_at: result.rows[0].departed_at,
    });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ error: "database error" });
  }
});

app.use((req, res) => res.status(404).json({ error: "not found" }));

module.exports = app;
