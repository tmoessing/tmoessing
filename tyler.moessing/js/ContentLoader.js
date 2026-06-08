import { Parser } from './Parser.js';
import { Renderer } from './Renderer.js';
import { Timeline } from './Timeline.js';
import { Search } from './Search.js';

/**
 * Content Loader - Orchestrates data fetching and component coordination.
 */
export class ContentLoader {
    constructor() {
        this.content = {};
        this.parser = new Parser();
        this.renderer = new Renderer(this.parser);
        this.timeline = new Timeline(this.parser, this.renderer);
        this.search = new Search(this.parser, this.renderer);
    }

    /**
     * Entry point: Fetches professional and personal content concurrently.
     */
    async load() {
        try {
            const [profRes, persRes] = await Promise.all([
                fetch('docs/professional_content.md?v=3.3'),
                fetch('docs/personal_content.md?v=3.3')
            ]);
            
            const [profText, persText] = await Promise.all([
                profRes.text(),
                persRes.text()
            ]);

            this.content = this.parser.parseContent(profText);
            this.content = this.parser.parseContent(persText, this.content);
            
            this.search.collectSearchableItems(this.content);
            this.populatePage();
            
            // Check if we should perform an initial search
            this.handleSearchFromHash();
        } catch (error) {
            console.error('Error loading resume content:', error);
        }
    }

    /**
     * Injects the parsed content into the DOM.
     */
    populatePage() {
        const c = this.content;
        this.renderer.renderProfile(c.profile);
        this.renderer.renderContact(c.contact);
        this.renderer.renderAbout(c.about);
        
        // Professional Core
        this.renderer.renderSection(c.experience, '#experience-container', this.renderer.createExperienceCard);
        this.renderer.renderEducation(c.education);
        this.timeline.buildTimeline(c);
        
        // Sorting and rendering Projects
        const projects = c.projects || [];
        projects.sort((a, b) => this.parser.parseDateRange(b.dates).end - this.parser.parseDateRange(a.dates).end);
        this.renderer.renderSection(projects, '#projects-container', this.renderer.createProjectCard);
        
        this.renderer.renderSkills(c.skills);

        // Professional Extensions
        this.renderer.renderSection(c.service, '#service-container', this.renderer.createExperienceCard);
        this.renderer.renderSection(c.volunteer, '#volunteer-container', this.renderer.createExperienceCard);
        this.renderer.renderSection(c.interests, '#interests-container', this.renderer.createExperienceCard);

        // Unified Personal View
        this.populatePersonalUnified();
    }

    populatePersonalUnified() {
        const unifiedContainer = '#personal-unified-container';
        const containerEl = document.querySelector(unifiedContainer);
        if (!containerEl) return;
        
        containerEl.innerHTML = '';

        // Create Section 1 Wrapper (Sick Picks)
        const picksSection = document.createElement('div');
        picksSection.id = 'picks-section';
        picksSection.className = 'personal-sub-view';
        containerEl.appendChild(picksSection);

        // Create Section 2 Wrapper (Projects)
        const projectsSection = document.createElement('div');
        projectsSection.id = 'projects-section-personal';
        projectsSection.className = 'personal-sub-view';
        projectsSection.style.display = 'none';
        containerEl.appendChild(projectsSection);
        
        // --- SECTION 1: Sick Picks and Shameless Plugs ---
        const h1Container = document.createElement('div');
        h1Container.className = 'personal-section-header';

        const h1 = document.createElement('h3');
        h1.className = 'card-title';
        h1.style.margin = '0';
        h1.textContent = 'Sick Picks and Shameless Plugs';
        h1Container.appendChild(h1);
        picksSection.appendChild(h1Container);

        // Filter Logic for Library
        const libraryItems = [
            ...(this.content.resources || []).map(item => ({ ...item })),
            ...(this.content['reading list'] || []).map(item => ({ ...item, tags: item.tags ? `BOOK, ${item.tags}` : 'BOOK' }))
        ];

        // Collect Tags
        const rawTags = new Set();
        libraryItems.forEach(item => {
            if (item.tags) {
                item.tags.split(this.parser.TAG_SPLIT_REGEX).forEach(t => rawTags.add(t.trim()));
            }
        });

        // Custom Sort Logic for Personal Section
        const sortTags = (tags) => {
            const weights = { 
                'LIFE HACK': 1, 
                'BOOK': 2, 
                'PHOTOS': 3,
                'PODCAST': 4,
                'SELF-HELP': 5,
                'HUMOR': 6,
                'TECH': 10, 
                'DEV': 11 
            };
            return [...tags].sort((a, b) => {
                const aU = a.toUpperCase();
                const bU = b.toUpperCase();
                const aW = weights[aU] || 7;
                const bW = weights[bU] || 7;
                if (aW !== bW) return aW - bW;
                return aU.localeCompare(bU);
            });
        };

        const libraryTags = ['All', ...sortTags(rawTags)];

        // Create Filter Bar
        const filterBar = document.createElement('div');
        filterBar.className = 'card-tags personal-filter-bar';
        picksSection.appendChild(filterBar);

        const libraryResultsContainer = document.createElement('div');
        libraryResultsContainer.className = 'personal-sub-view';
        picksSection.appendChild(libraryResultsContainer);

        const renderFilteredLibrary = (filterTag) => {
            libraryResultsContainer.innerHTML = '';

            const filtered = filterTag === 'All' 
                ? libraryItems 
                : libraryItems.filter(item => item.tags && item.tags.split(this.parser.TAG_SPLIT_REGEX).some(t => t.trim() === filterTag));

            // Group by first tag
            const groups = {};
            filtered.forEach(item => {
                const firstTag = item.tags ? item.tags.split(this.parser.TAG_SPLIT_REGEX)[0].trim().toUpperCase() : 'OTHER';
                if (!groups[firstTag]) groups[firstTag] = [];
                groups[firstTag].push(item);
            });

            // Sort group names using the same logic
            const groupNames = sortTags(Object.keys(groups)).sort((a, b) => {
                const weights = { 
                    'LIFE HACK': 1, 
                    'BOOK': 2, 
                    'PHOTOS': 3, 
                    'PODCAST': 4,
                    'SELF-HELP': 5,
                    'HUMOR': 6,
                    'OTHER': 8,
                    'TECH': 10, 
                    'DEV': 11 
                };
                const aU = a.toUpperCase();
                const bU = b.toUpperCase();
                const aW = weights[aU] || 9;
                const bW = weights[bU] || 9;
                if (aW !== bW) return aW - bW;
                return aU.localeCompare(bU);
            });

            groupNames.forEach(tagName => {
                // Add Small Header for Tag with margin top for grouping
                const tagHeader = document.createElement('h4');
                tagHeader.className = 'library-tag-header';
                tagHeader.textContent = tagName;
                libraryResultsContainer.appendChild(tagHeader);

                // Group items container with NO gap
                const groupContainer = document.createElement('div');
                groupContainer.className = 'library-group-container';
                
                groups[tagName].forEach((item, index) => {
                    const card = this.renderer.createResourceCard(item, 'Resource');
                    card.classList.add('library-item');
                    groupContainer.appendChild(card);
                });
                libraryResultsContainer.appendChild(groupContainer);
            });

            // Update active state of tags
            filterBar.querySelectorAll('.skill-tag').forEach(btn => {
                const btnTag = btn.textContent.toUpperCase();
                const isSelected = btnTag === filterTag.toUpperCase();
                const style = btnTag === 'ALL' ? { bg: 'var(--primary-blue)', text: '#fff' } : this.renderer.getTagStyle(btnTag);
                
                if (isSelected) {
                    btn.style.background = style.bg;
                    btn.style.color = style.text;
                    btn.style.borderColor = 'transparent';
                    btn.style.opacity = '1';
                    btn.style.transform = 'scale(1.05)';
                    btn.style.boxShadow = 'var(--shadow-sm)';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--text-secondary)';
                    btn.style.borderColor = 'var(--border-color)';
                    btn.style.opacity = '0.7';
                    btn.style.transform = 'scale(1)';
                    btn.style.boxShadow = 'none';
                }
            });
        };

        libraryTags.forEach(tag => {
            const tagBtn = document.createElement('button');
            tagBtn.className = 'skill-tag';
            tagBtn.textContent = tag.toUpperCase();
            tagBtn.style.cursor = 'pointer';
            tagBtn.style.transition = 'all 0.2s ease';
            
            tagBtn.onclick = () => renderFilteredLibrary(tag);
            filterBar.appendChild(tagBtn);
        });

        // --- SECTION 2: Personal Projects ---
        const h2Container = document.createElement('div');
        h2Container.className = 'personal-section-header';
        
        const h2 = document.createElement('h3');
        h2.className = 'card-title';
        h2.style.margin = '0';
        h2.textContent = 'Personal Projects';
        
        h2Container.appendChild(h2);

        const venmoBtn = document.createElement('a');
        venmoBtn.href = "#";
        venmoBtn.target = "_blank";
        venmoBtn.className = "venmo-btn";
        venmoBtn.style.display = "none";
        venmoBtn.innerHTML = `
            <svg class="venmo-icon" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.88 4.94c.52.85.75 1.72.75 2.83 0 3.52-3 8.1-5.45 11.31H8.66l-2.23-13.36 4.88-.46 1.19 9.51c1.1-1.8 2.47-4.63 2.47-6.55 0-1.05-.18-1.77-.46-2.36l3.37.02z" />
            </svg> Support
        `;
        h2Container.appendChild(venmoBtn);
        
        // Append elements to projects section
        const gridContainer = document.createElement('div');
        gridContainer.className = 'projects-vertical-stack';
        projectsSection.appendChild(h2Container);
        projectsSection.appendChild(gridContainer);

        // Initial render of library items
        renderFilteredLibrary('All');

        // Projects below - Pulls from both Professional and Personal
        const allProjects = [
            ...(this.content.projects || []).map(p => ({ ...p, category: 'Professional' })),
            ...(this.content['personal projects'] || []).map(p => ({ ...p, category: 'Personal' }))
        ];
        allProjects.sort((a, b) => this.parser.parseDateRange(b.dates).end - this.parser.parseDateRange(a.dates).end);
        
        allProjects.forEach(project => {
            gridContainer.appendChild(this.renderer.createProjectCard(project, project.category));
        });

        // Update contact venmo links if they exist
        if (this.content.contact && this.content.contact.venmo) {
            venmoBtn.href = this.content.contact.venmo;
            venmoBtn.style.display = 'inline-flex';
        }

        // Sync visibility with current hash
        if (typeof window.switchPersonalView === 'function') {
            const hash = window.location.hash;
            if (hash === '#/personal/personal-projects') {
                window.switchPersonalView('projects', false);
            } else if (hash.startsWith('#/personal')) {
                window.switchPersonalView('picks', false);
            }
        }
    }

    /**
     * Proxy to Search module.
     */
    performSearch(query) {
        this.search.performSearch(query);
    }

    renderSuggestedTags() {
        this.search.renderSuggestedTags();
    }

    handleSearchFromHash() {
        const hash = window.location.hash;
        if (hash.startsWith('#/professional/search')) {
            const searchPart = hash.includes('?') ? hash.split('?')[1] : '';
            const params = new URLSearchParams(searchPart);
            const tag = params.get('tag');
            const q = params.get('q');
            const query = tag || q;
            
            if (query) {
                const searchInput = document.querySelector('#search-input');
                if (searchInput) searchInput.value = query;
                this.performSearch(query);
            }
            
            if (typeof window.switchView === 'function') {
                window.switchView('search', false);
            }
        }
    }
}
