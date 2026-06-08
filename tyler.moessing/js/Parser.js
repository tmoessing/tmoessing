/**
 * Parser module for handling Markdown and Date Range logic.
 */
export class Parser {
    constructor() {
        this.TAG_SPLIT_REGEX = /,(?![^(]*\))/g;
        this.ARRAY_SECTIONS = [
            'experience', 'projects', 'personal projects', 
            'resources', 'reading list', 'service', 
            'volunteer', 'interests'
        ];
    }

    /**
     * Parses Markdown into a structured content object.
     * @param {string} markdown Raw markdown text.
     * @returns {Object} Structured content object.
     */
    parseContent(markdown, existingContent = {}) {
        const lines = markdown.split('\n');
        let currentSection = null;
        let currentSubsection = null;
        let currentItem = {};
        const content = existingContent;

        const saveCurrentItem = () => {
            if (currentSection && currentSubsection && Object.keys(currentItem).length > 0) {
                if (Array.isArray(content[currentSection])) {
                    content[currentSection].push({ ...currentItem, title: currentSubsection });
                } else {
                    content[currentSection][currentSubsection] = { ...currentItem };
                }
            }
            currentItem = {};
        };

        for (let line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Main section headers (## Section)
            if (trimmedLine.startsWith('## ') && !trimmedLine.startsWith('### ')) {
                saveCurrentItem();
                currentSection = trimmedLine.replace('## ', '').trim().toLowerCase();
                if (!content[currentSection]) {
                    content[currentSection] = this.ARRAY_SECTIONS.includes(currentSection) ? [] : {};
                }
                currentSubsection = null;
                continue;
            }

            // Subsection headers (### Subsection)
            if (trimmedLine.startsWith('### ')) {
                saveCurrentItem();
                currentSubsection = trimmedLine.replace('### ', '').trim();
                continue;
            }

            if (!currentSection) continue;

            // List items (e.g., - Name | URL) - mainly for Resources
            if (trimmedLine.startsWith('- ')) {
                if (currentSubsection) {
                    saveCurrentItem();
                    currentSubsection = null;
                }
                const parts = trimmedLine.substring(2).split('|');
                if (parts.length === 2 && Array.isArray(content[currentSection])) {
                    content[currentSection].push({
                        name: parts[0].trim(),
                        url: parts[1].trim()
                    });
                }
                continue;
            }

            // Key-value pairs (key: value)
            const colonIndex = trimmedLine.indexOf(':');
            if (colonIndex > 0 && colonIndex < 30 && !trimmedLine.startsWith('- ')) {
                const key = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
                const value = trimmedLine.substring(colonIndex + 1).trim();

                if (currentSubsection) {
                    currentItem[key] = value;
                } else {
                    content[currentSection][key] = value;
                }
            } else {
                // Handle text directly under a section or subsection
                if (currentSubsection) {
                    currentItem.description = currentItem.description 
                        ? `${currentItem.description} ${trimmedLine}` 
                        : trimmedLine;
                } else {
                    content[currentSection].mainText = content[currentSection].mainText 
                        ? `${content[currentSection].mainText} ${trimmedLine}` 
                        : trimmedLine;
                }
            }
        }

        saveCurrentItem(); // Final item
        return content;
    }

    /**
     * Parses a date string into a numerical value for comparison and layout.
     * @param {string} dateStr e.g., "Jan 2020 - Present"
     * @returns {Object} { start: number, end: number }
     */
    parseDateRange(dateStr) {
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

    /**
     * Converts a string to a URL-friendly slug.
     */
    slugify(text) {
        return (text || '').toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
    }
}
