const { formatHHMM, computeNextHHMM } = require('../src/lib/time');

describe('Format HH:MM', () => {
    test('formate correctement les heures avec minutes < 10', () => {
        const date = new Date(2025, 0, 1, 10, 5, 0);
        expect(formatHHMM(date)).toBe('10:05');
    });

    test('formate correctement les heures avec minutes >= 10', () => {
        const date = new Date(2025, 0, 1, 14, 20, 0);
        expect(formatHHMM(date)).toBe('14:20');
    });

    test('formate correctement minuit', () => {
        const date = new Date(2025, 0, 1, 0, 0, 0);
        expect(formatHHMM(date)).toBe('00:00');
    });

    test('formate correctement midi', () => {
        const date = new Date(2025, 0, 1, 12, 0, 0);
        expect(formatHHMM(date)).toBe('12:00');
    });

    test('lève une erreur pour date invalide', () => {
        expect(() => formatHHMM('invalid')).toThrow(TypeError);
        expect(() => formatHHMM(new Date('invalid'))).toThrow(TypeError);
    });
});

describe('Compute Next HH:MM - Cas normaux', () => {
    test('10:00 + 3min → 10:03', () => {
        const base = new Date(2025, 0, 1, 10, 0, 0);
        expect(computeNextHHMM(base, 3)).toBe('10:03');
    });

    test('14:20 + 7min → 14:27', () => {
        const base = new Date(2025, 0, 1, 14, 20, 0);
        expect(computeNextHHMM(base, 7)).toBe('14:27');
    });

    test('09:55 + 10min → 10:05', () => {
        const base = new Date(2025, 0, 1, 9, 55, 0);
        expect(computeNextHHMM(base, 10)).toBe('10:05');
    });

    test('00:00 + 60min → 01:00', () => {
        const base = new Date(2025, 0, 1, 0, 0, 0);
        expect(computeNextHHMM(base, 60)).toBe('01:00');
    });
});

describe('Compute Next HH:MM - Cas limites', () => {
    test('10:58 + 5min → 11:03 (changement d\'heure)', () => {
        const base = new Date(2025, 0, 1, 10, 58, 0);
        expect(computeNextHHMM(base, 5)).toBe('11:03');
    });

    test('23:59 + 5min → 00:04 (minuit suivant)', () => {
        const base = new Date(2025, 0, 1, 23, 59, 0);
        expect(computeNextHHMM(base, 5)).toBe('00:04');
    });

    test('23:45 + 120min → 01:45 (jour suivant)', () => {
        const base = new Date(2025, 0, 1, 23, 45, 0);
        expect(computeNextHHMM(base, 120)).toBe('01:45');
    });

    test('headwayMin = 0 → même heure', () => {
        const base = new Date(2025, 0, 1, 15, 30, 0);
        expect(computeNextHHMM(base, 0)).toBe('15:30');
    });

    test('headwayMin avec grandes valeurs', () => {
        const base = new Date(2025, 0, 1, 10, 0, 0);
        expect(computeNextHHMM(base, 1440)).toBe('10:00'); // 24h après
    });
});

describe('Compute Next HH:MM - Validation des entrées', () => {
    test('headwayMin négatif → RangeError', () => {
        const base = new Date(2025, 0, 1, 10, 0, 0);
        expect(() => computeNextHHMM(base, -5)).toThrow(RangeError);
    });

    test('headwayMin non numérique → TypeError', () => {
        const base = new Date(2025, 0, 1, 10, 0, 0);
        expect(() => computeNextHHMM(base, 'invalid')).toThrow(TypeError);
    });

    test('baseDate invalide → TypeError', () => {
        expect(() => computeNextHHMM('invalid', 5)).toThrow(TypeError);
    });

    test('baseDate avec NaN → TypeError', () => {
        expect(() => computeNextHHMM(new Date('invalid'), 5)).toThrow(TypeError);
    });

    test('sans paramètres → TypeError', () => {
        expect(() => computeNextHHMM()).toThrow(TypeError);
    });
});