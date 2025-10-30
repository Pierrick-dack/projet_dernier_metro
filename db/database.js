const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'rnbking2001',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Gestion des événements de connexion
pool.on('connect', (client) => {
    console.log('✅ Nouvelle connexion PostgreSQL établie');
});

pool.on('error', (err, client) => {
    console.error('❌ Erreur de connexion PostgreSQL:', err.message);
});

// db/database.js - Ajoutez cette condition
pool.on('remove', (client) => {
    if (process.env.NODE_ENV !== 'test') {
        console.log('🔌 Connexion PostgreSQL fermée');
    }
});

// Test de connexion au démarrage
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Connecté à PostgreSQL avec succès');
        client.release();
    } catch (error) {
        console.error('❌ Impossible de se connecter à PostgreSQL:', error.message);
        throw error;
    }
}

module.exports = pool;
module.exports.testConnection = testConnection;