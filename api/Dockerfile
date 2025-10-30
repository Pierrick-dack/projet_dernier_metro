# api/Dockerfile - OPTIMISÉ
FROM node:18-alpine AS builder

# Étape de construction pour les dépendances
WORKDIR /app

# Copier les fichiers de dépendances d'abord pour optimiser le cache
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Étape de production
FROM node:18-alpine AS production

WORKDIR /app

# Copier les node_modules de l'étape builder
COPY --from=builder /app/node_modules ./node_modules

# Copier le code source
COPY . .

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Exposition du port
EXPOSE 3000

# Utilisateur non-root pour la sécurité
USER node

# Commande de démarrage
CMD ["node", "server.js"]