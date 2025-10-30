// db/init.js
const fs = require('fs');
const path = require('path');
const pool = require('./database');

async function initializeDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Initialisation de la base de données...');

        // Étape 1: Vérifier si la base de données existe, sinon la créer
        await ensureDatabaseExists();

        // Étape 2: Vérifier si les tables existent, sinon les créer
        const tablesExist = await checkTablesExist(client);
        
        if (!tablesExist) {
            console.log('📦 Création des tables...');
            await executeSchema(client);
            console.log('✅ Tables créées avec succès');
        } else {
            console.log('✅ Tables déjà existantes');
        }

        // Étape 3: Insérer les données initiales
        await executeSeedData(client);
        
        console.log('🎉 Base de données initialisée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur lors de l initialisation de la base de données:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

async function ensureDatabaseExists() {
    try {
        // Vérifier si la base de données existe en essayant de se connecter
        await pool.query('SELECT 1');
        console.log('✅ Base de données connectée');
        return true;
    } catch (error) {
        console.error('❌ La base de données n existe pas ou erreur de connexion:', error.message);
        throw error;
    }
}

async function checkTablesExist(client) {
    try {
        // Vérifier l'existence des trois tables principales
        const result = await client.query(`
            SELECT 
                EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stations') as stations_exists,
                EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'headways') as headways_exists,
                EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'last_metro') as last_metro_exists;
        `);
        
        const { stations_exists, headways_exists, last_metro_exists } = result.rows[0];
        const allTablesExist = stations_exists && headways_exists && last_metro_exists;
        
        if (!allTablesExist) {
            console.log('📊 État des tables:');
            console.log(`   - stations: ${stations_exists ? '✅' : '❌'}`);
            console.log(`   - headways: ${headways_exists ? '✅' : '❌'}`);
            console.log(`   - last_metro: ${last_metro_exists ? '✅' : '❌'}`);
        }
        
        return allTablesExist;
    } catch (error) {
        console.error('Erreur lors de la vérification des tables:', error.message);
        return false;
    }
}

async function executeSchema(client) {
    try {
        const schemaPath = path.join(__dirname, 'init', '001_schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error('Fichier de schéma non trouvé: ' + schemaPath);
        }
        
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Exécuter le schéma table par table pour mieux gérer les erreurs
        const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                await client.query(statement);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l exécution du schéma:', error.message);
        throw error;
    }
}

async function executeSeedData(client) {
    try {
        const seedPath = path.join(__dirname, 'init', '002_seed.sql');
        
        if (!fs.existsSync(seedPath)) {
            console.log('⚠️  Aucun fichier de données initiales trouvé');
            return;
        }
        
        const seedSQL = fs.readFileSync(seedPath, 'utf8').trim();
        
        if (!seedSQL) {
            console.log('⚠️  Fichier de données initiales vide');
            return;
        }
        
        // Vérifier si le fichier seed contient des instructions SQL valides
        const statements = seedSQL.split(';').filter(stmt => stmt.trim());
        
        if (statements.length === 0) {
            console.log('⚠️  Aucune instruction SQL valide dans le fichier de données initiales');
            return;
        }
        
        let insertedRecords = 0;
        
        for (const statement of statements) {
            if (statement.trim()) {
                const result = await client.query(statement);
                if (result.command === 'INSERT') {
                    insertedRecords += result.rowCount || 0;
                }
            }
        }
        
        console.log(`✅ Données initiales insérées: ${insertedRecords} enregistrements`);
        
    } catch (error) {
        // Si l'erreur est due à des doublons (ON CONFLICT), ce n'est pas grave
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
            console.log('ℹ️  Certaines données existaient déjà (gérées par ON CONFLICT)');
        } else {
            console.warn('⚠️  Avertissement lors de l insertion des données initiales:', error.message);
        }
    }
}

async function checkDatabaseConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Connexion à PostgreSQL établie');
        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion à PostgreSQL:', error.message);
        return false;
    }
}

// Fonction pour réinitialiser complètement la base (utile pour les tests)
async function resetDatabase() {
    const client = await pool.connect();
    try {
        console.log('🔄 Réinitialisation de la base de données...');
        
        // Désactiver les contraintes de clé étrangère temporairement
        await client.query('SET session_replication_role = replica;');
        
        // Supprimer toutes les tables
        await client.query(`
            DROP TABLE IF EXISTS last_metro CASCADE;
            DROP TABLE IF EXISTS headways CASCADE;
            DROP TABLE IF EXISTS stations CASCADE;
        `);
        
        // Réactiver les contraintes
        await client.query('SET session_replication_role = DEFAULT;');
        
        console.log('✅ Base de données réinitialisée');
    } catch (error) {
        console.error('❌ Erreur lors de la réinitialisation:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { 
    initializeDatabase, 
    checkDatabaseConnection,
    resetDatabase
};