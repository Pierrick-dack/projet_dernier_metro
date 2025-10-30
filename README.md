# Projet Dernier Metro 🚇


[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://gitlab.com/kamelapierrick/projet_dernier_metro)


## 🔒 Security Reports

### Latest Security Scan Results

| Sévérité | NPM Audit | Container Scan |
|----------|-----------|----------------|
| Critical | 0         | 0              |
| High     | 0         | 0              |
| Medium   | X         | X              |
| Low      | X         | X              |

*Last updated: $(date)*

### Security Policy

- **Critical/High vulnerabilities**: Block deployment
- **Medium vulnerabilities**: Review within 1 week  
- **Low vulnerabilities**: Review within 1 month



## 🚀 Déploiement Staging

```bash
# Déployer
docker compose -f docker-compose.staging.yml up -d

# Smoke tests
curl http://localhost:3000/health
curl "http://localhost:3000/last-metro?station=République"

# Vérifier les logs
docker compose -f docker-compose.staging.yml logs -f api