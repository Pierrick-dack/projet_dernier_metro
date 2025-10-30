require('dotenv').config();
const app = require("./api/app");
const { initializeDatabase, checkDatabaseConnection } = require("./db/init");

const port = process.env.PORT || 3001;

async function startServer() {
    try {
        console.log('🚀 Démarrage de l application...');
        
        // Vérifier la connexion à la base de données
        const isDbConnected = await checkDatabaseConnection();
        
        if (!isDbConnected) {
            console.log('❌ Impossible de se connecter à la base de données');
            process.exit(1);
        }

        // Initialiser la base de données (créer tables + données si nécessaire)
        await initializeDatabase();

        // Démarrer le serveur
        app.listen(port, () => {
            console.log(`🚆 Dernier Metro API lancé sur le port ${port}`);
            console.log(`📖 Swagger dispo sur http://localhost:${port}/api-docs`);
            console.log('✅ Tous les systèmes opérationnels');
        });

    } catch (error) {
        console.error('❌ Erreur critique lors du démarrage du serveur:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}