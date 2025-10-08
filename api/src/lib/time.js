/**
 * Formatte une date en chaîne "HH:MM"
 * @param {Date} date - La date à formater
 * @returns {string} Heure formatée "HH:MM"
 */
function formatHHMM(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        throw new TypeError('Invalid date provided');
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Calcule l'heure d'arrivée en ajoutant des minutes à une date de base
 * @param {Date} baseDate - Date de départ
 * @param {number} headwayMin - Nombre de minutes à ajouter
 * @returns {string} Heure d'arrivée formatée "HH:MM"
 */
function computeNextHHMM(baseDate, headwayMin) {
    // Validation des entrées
    if (!(baseDate instanceof Date) || isNaN(baseDate)) {
        throw new TypeError('Invalid baseDate provided');
    }

    if (typeof headwayMin !== 'number' || isNaN(headwayMin)) {
        throw new TypeError('headwayMin must be a number');
    }

    if (headwayMin < 0) {
        throw new RangeError('headwayMin cannot be negative');
    }

    // Calcul de la nouvelle date
    const newDate = new Date(baseDate.getTime() + headwayMin * 60 * 1000);
    return formatHHMM(newDate);
}

module.exports = {
    formatHHMM,
    computeNextHHMM
};