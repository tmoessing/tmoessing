// Utility helpers for ContentLoader
export const TAG_SPLIT_REGEX = /,(?![^(]*\))/g;

export const ARRAY_SECTIONS = [
    'experience', 'projects', 'personal projects', 
    'reading list', 'resources', 'service', 
    'volunteer', 'interests'
];

export function slugify(text) {
    return (text || '').toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
}

export function parseDateRange(dateStr) {
    if (!dateStr) return { start: 0, end: 0 };
    const now = new Date();
    const present = now.getFullYear() + (now.getMonth() / 12);
    const months = { jan: 0, feb: 1/12, mar: 2/12, apr: 3/12, may: 4/12, jun: 5/12, jul: 6/12, aug: 7/12, sep: 8/12, oct: 9/12, nov: 10/12, dec: 11/12 };

    const parseSingle = (str) => {
        str = str.toLowerCase().trim();
        if (str.includes('present')) return present;
        const yearMatch = str.match(/\d{4}/);
        if (!yearMatch) return 0;
        let val = parseInt(yearMatch[0]);
        for (const [m, offset] of Object.entries(months)) if (str.includes(m)) { val += offset; break; }
        return val;
    };

    if (dateStr.includes('-') || dateStr.toLowerCase().includes(' to ')) {
        const parts = dateStr.split(/-| to /);
        return { start: parseSingle(parts[0]), end: parseSingle(parts[1]) || present };
    }
    const date = parseSingle(dateStr);
    return { start: date - 0.5, end: date };
}
