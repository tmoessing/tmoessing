/**
 * Timeline module for building the visual journey sidebar.
 */
export class Timeline {
    constructor(parser, renderer) {
        this.parser = parser;
        this.renderer = renderer;
    }

    /**
     * Builds the visual timeline sidebar.
     */
    buildTimeline(content) {
        const container = document.querySelector('#timeline-container');
        if (!container) return;

        let items = [];
        
        // Helper to determine category
        const getCategory = (title, defaultCat) => {
            const t = (title || '').toLowerCase();
            if (t.includes('research')) return 'research';
            if (t.includes('counselor') || t.includes('officer') || t.includes('leadership') || t.includes('instructor')) return 'leadership';
            if (t.includes('volunteer') || t.includes('missionary')) return 'volunteer';
            return defaultCat;
        };

        // Add Experience
        if (content.experience) content.experience.forEach(exp => {
            const range = this.parser.parseDateRange(exp.dates);
            const category = getCategory(exp.title, 'job');
            items.push({ ...range, dateLabel: exp.dates, title: exp.title, org: exp.company, category, targetId: `card-${this.parser.slugify(exp.title)}` });
        });

        // Add Education
        if (content.education) Object.entries(content.education).forEach(([title, edu]) => {
            if (title === 'mainText' || typeof edu !== 'object') return;
            const range = this.parser.parseDateRange(edu.dates || edu.graduation);
            const slug = this.parser.slugify(title);
            items.push({ ...range, dateLabel: edu.dates || edu.graduation, title, org: edu.institution, category: 'education', targetId: `card-${slug}` });
        });

        // Add Projects
        if (content.projects) content.projects.forEach(proj => {
            const range = this.parser.parseDateRange(proj.dates);
            if (range.start > 0) {
                const slug = this.parser.slugify(proj.title);
                items.push({ ...range, dateLabel: proj.dates, title: proj.title, org: 'Project', category: 'project', targetId: `card-${slug}` });
            }
        });

        const addActivity = (list, defaultCat) => {
            if (list) list.forEach(item => {
                const range = this.parser.parseDateRange(item.dates);
                if (range.start > 0) {
                    const category = getCategory(item.title, defaultCat);
                    items.push({ ...range, dateLabel: item.dates, title: item.title, org: item.company || item.location, category, targetId: `card-${this.parser.slugify(item.title)}` });
                }
            });
        };
        addActivity(content.service, 'volunteer');
        addActivity(content.volunteer, 'volunteer');

        items = items.filter(i => i.start > 0);
        if (items.length === 0) return;

        const minYear = Math.min(...items.map(i => i.start)) - 0.5;
        const maxYear = Math.max(...items.map(i => i.end)) + 0.5;
        const yearScale = 150; // Balanced scale for readability and density
        container.style.height = `${(maxYear - minYear) * yearScale}px`;
        container.innerHTML = '<div class="timeline-tracks"></div>';
        
        for (let y = Math.floor(maxYear); y >= Math.floor(minYear); y--) {
            const marker = document.createElement('div');
            marker.className = 'timeline-year-marker';
            marker.style.top = `${(maxYear - y) * yearScale}px`;
            marker.innerHTML = `<span>${y}</span>`;
            container.appendChild(marker);
        }

        // 1. Assign subLanes using greedy packing (ensures lowest index is used)
        items.sort((a, b) => b.end - a.end);
        const subLanes = [];
        items.forEach(item => {
            let laneIndex = subLanes.findIndex(events => !events.some(e => 
                (item.start < e.end - 0.01 && item.end > e.start + 0.01)
            ));
            
            if (laneIndex === -1) {
                laneIndex = subLanes.length;
                subLanes.push([item]);
            } else {
                subLanes[laneIndex].push(item);
            }
            item.subLane = laneIndex;
        });

        // 2. Calculate local max concurrency for each item to determine its width
        items.forEach(item => {
            const overlaps = items.filter(other => 
                (item.start < other.end - 0.01 && item.end > other.start + 0.01)
            );
            
            // Find the maximum number of items active at any single point during this item's span
            let maxC = 1;
            const pointsToCheck = new Set([item.start + 0.005, item.end - 0.005]);
            overlaps.forEach(o => {
                if (o.start > item.start && o.start < item.end) pointsToCheck.add(o.start + 0.005);
                if (o.end > item.start && o.end < item.end) pointsToCheck.add(o.end - 0.005);
            });

            pointsToCheck.forEach(p => {
                const countAtPoint = overlaps.filter(o => p >= o.start && p <= o.end).length;
                if (countAtPoint > maxC) maxC = countAtPoint;
            });
            item.maxConcurrency = maxC;
        });

        items.forEach(item => {
            const slug = this.parser.slugify(item.title);
            const el = document.createElement('div');
            el.id = `timeline-bar-${slug}`;
            el.className = `timeline-bar ${item.category}`;
            el.setAttribute('title', `${item.title}\n${item.org}\n${item.dateLabel}`);
            
            // Width is 100% divided by the maximum local concurrency
            const width = 100 / item.maxConcurrency;
            const leftPos = item.subLane * width;
            
            // Determine tooltip alignment to prevent cutting off
            let tooltipAlignClass = '';
            if (leftPos < 25) tooltipAlignClass = 'align-left';
            else if (leftPos > 65) tooltipAlignClass = 'align-right';

            el.style.top = `${(maxYear - item.end) * yearScale}px`;
            el.style.height = `${Math.max((item.end - item.start) * yearScale, 36)}px`;
            el.style.left = `${leftPos}%`;
            el.style.width = `${width - 0.5}%`;
            
            el.onclick = () => {
                const target = document.getElementById(item.targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('highlight-card');
                    setTimeout(() => target.classList.remove('highlight-card'), 2000);
                }
            };

            el.innerHTML = `
                <div class="timeline-bar-content">
                    <div class="timeline-bar-title">${item.title}</div>
                </div>
                <div class="timeline-bar-tooltip ${tooltipAlignClass}">
                    <strong>${item.title}</strong><br>${item.org}<br>${item.dateLabel}
                </div>`;
            container.appendChild(el);
        });
    }
}
