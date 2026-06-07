/**
 * Content Loader - Parses markdown content and populates the resume website.
 * Follows a Research -> Strategy -> Execution lifecycle for data management.
 */
class ContentLoader {
    constructor() {
        this.content = {};
        this.searchableItems = []; // Store items for search functionality
        this.allTags = new Set(); // Store all unique tags
        // Robust regex to split by comma but ignore commas inside parentheses
        this.TAG_SPLIT_REGEX = /,(?![^(]*\))/g;
        // Sections that should be treated as arrays of items
        this.ARRAY_SECTIONS = [
            'experience', 'projects', 'personal projects', 
            'reading list', 'resources', 'service', 
            'volunteer', 'interests'
        ];
    }

    /**
     * Entry point: Fetches professional and personal content concurrently.
     */
    async load() {
        try {
            const [profRes, persRes] = await Promise.all([
                fetch('professional_content.md?v=3.3'),
                fetch('personal_content.md?v=3.3')
            ]);
            
            const [profText, persText] = await Promise.all([
                profRes.text(),
                persRes.text()
            ]);

            this.parseContent(profText);
            this.parseContent(persText);
            this.collectSearchableItems();
            this.populatePage();
            
            // Check if we should perform an initial search
            this.handleSearchFromHash();
        } catch (error) {
            console.error('Error loading resume content:', error);
        }
    }

    /**
     * Collects all relevant items into a single searchable array and gathers unique tags.
     */
    collectSearchableItems() {
        this.searchableItems = [];
        this.allTags = new Set();
        
        // Helper to add items with category
        const addItems = (section, category) => {
            const items = this.content[section];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    this.searchableItems.push({ 
                        ...item, 
                        category: category,
                        section: section
                    });
                    if (item.tags) {
                        item.tags.split(this.TAG_SPLIT_REGEX).forEach(t => this.allTags.add(t.trim()));
                    }
                });
            } else if (typeof items === 'object') {
                Object.entries(items).forEach(([title, details]) => {
                    if (title === 'mainText' || typeof details !== 'object') return;
                    this.searchableItems.push({ 
                        ...details, 
                        title: title,
                        category: category,
                        section: section
                    });
                    if (details.tags) {
                        details.tags.split(this.TAG_SPLIT_REGEX).forEach(t => this.allTags.add(t.trim()));
                    }
                });
            }
        };

        addItems('experience', 'job');
        addItems('projects', 'project');
        addItems('personal projects', 'project');
        addItems('service', 'service');
        addItems('volunteer', 'volunteer');
        addItems('interests', 'leadership');
        addItems('education', 'education');
        
        // Sort tags alphabetically
        this.allTags = new Set(Array.from(this.allTags).sort());
    }

    /**
     * Performs a search across all items by tag or text.
     */
    performSearch(query) {
        const queryEl = document.querySelector('#search-query-display');
        const countEl = document.querySelector('#search-count');

        if (!query || query.trim().length === 0) {
            if (queryEl) queryEl.textContent = '...';
            if (countEl) countEl.textContent = '0';
            this.renderSuggestedTags();
            return;
        }

        const normalizedQuery = query.toLowerCase().trim();
        const results = this.searchableItems.filter(item => {
            const tags = (item.tags || '').toLowerCase();
            const title = (item.title || item.degree || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const company = (item.company || item.institution || '').toLowerCase();

            return tags.includes(normalizedQuery) || 
                   title.includes(normalizedQuery) || 
                   description.includes(normalizedQuery) || 
                   company.includes(normalizedQuery);
        });

        this.renderSearchResults(results, query);
    }

    /**
     * Renders a tag cloud when search is empty.
     */
    renderSuggestedTags() {
        const container = document.querySelector('#search-results-container');
        if (!container) return;

        container.innerHTML = `
            <div class="suggested-tags-section" style="padding: 2rem; text-align: center;">
                <h3 style="margin-bottom: 1.5rem; color: var(--text-secondary); font-size: 1.1rem;">Explore by Tag</h3>
                <div class="card-tags" style="justify-content: center; gap: 12px; max-width: 800px; margin: 0 auto;">
                    ${Array.from(this.allTags).map(t => `
                        <a href="#/professional/search?tag=${encodeURIComponent(t)}" class="skill-tag" style="padding: 8px 16px; font-size: 0.9rem;" onclick="event.preventDefault(); document.querySelector('#search-input').value = '${t}'; window.location.hash = '/professional/search?tag=${encodeURIComponent(t)}'; window.contentLoader.performSearch('${t}');">${t}</a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Renders search results into the search container.
     */
    renderSearchResults(results, query) {
        const container = document.querySelector('#search-results-container');
        const countEl = document.querySelector('#search-count');
        const queryEl = document.querySelector('#search-query-display');
        
        if (!container) return;

        if (queryEl) queryEl.textContent = query;
        if (countEl) countEl.textContent = results.length;

        container.innerHTML = '';
        if (results.length === 0) {
            container.innerHTML = '<p class="no-results" style="padding: 3rem; text-align: center; color: var(--text-muted);">No items found matching your search.</p>';
            return;
        }

        results.forEach(item => {
            let card;
            if (item.section === 'education') {
                card = this.createEducationCard(item);
            } else if (item.section === 'projects' || item.section === 'personal projects') {
                card = this.createProjectCard(item);
            } else {
                card = this.createExperienceCard(item);
            }
            container.appendChild(card);
        });
    }

    /**
     * Handles AI queries and provides responses based on the loaded content.
     */
    askAI(query) {
        if (!query || query.trim().length === 0) return;

        const chatContainer = document.querySelector('#ai-chat-messages');
        const input = document.querySelector('#ai-input');
        if (!chatContainer || !input) return;

        // Clear input
        input.value = '';

        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-message user-message';
        userMsg.style.cssText = 'align-self: flex-end; max-width: 80%; background: var(--primary-blue); padding: 12px 16px; border-radius: 16px 16px 0 16px; font-size: 0.95rem; line-height: 1.5; color: white; box-shadow: var(--shadow-sm);';
        userMsg.textContent = query;
        chatContainer.appendChild(userMsg);

        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Generate response (Simulated AI)
        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-message ai-message';
            aiMsg.style.cssText = 'align-self: flex-start; max-width: 80%; background: var(--bg-tertiary); padding: 12px 16px; border-radius: 0 16px 16px 16px; font-size: 0.95rem; line-height: 1.5; color: var(--text-primary); border: 1px solid var(--border-color);';
            
            const response = this.generateAIResponse(query);
            aiMsg.innerHTML = response;
            chatContainer.appendChild(aiMsg);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 600);
    }

    /**
     * Generates a simple keyword-based response from content data.
     */
    generateAIResponse(query) {
        const q = query.toLowerCase();
        
        // Find matching items
        const results = this.searchableItems.filter(item => {
            const tags = (item.tags || '').toLowerCase();
            const title = (item.title || item.degree || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            return tags.includes(q) || title.includes(q) || description.includes(q);
        });

        if (q.includes('skill') || q.includes('technology') || q.includes('tools')) {
            return `Tyler has a wide range of skills. His top technologies include: <strong>${Array.from(this.allTags).slice(0, 10).join(', ')}</strong>, and many others you can find in the Skills section.`;
        }

        if (results.length > 0) {
            const topResult = results[0];
            const title = topResult.title || topResult.degree;
            const company = topResult.company || topResult.institution || '';
            const desc = topResult.description || '';
            
            let resp = `I found some relevant information in Tyler's history: <br><br><strong>${title}</strong> ${company ? `at ${company}` : ''}<br>${desc.substring(0, 200)}${desc.length > 200 ? '...' : ''}`;
            
            if (results.length > 1) {
                resp += `<br><br>He also has ${results.length - 1} other related experience(s). You might want to check the Search Mode for "${query}" to see all of them!`;
            }
            return resp;
        }

        if (q.includes('hello') || q.includes('hi ')) {
            return "Hi there! I can help you find specific details about Tyler's background. Try asking about his Python experience or his machine learning projects.";
        }

        return "I'm not quite sure about that specific question, but I can tell you that Tyler is a Computer Science student at BYU with a 3.98 GPA and strong interests in Machine Learning and Statistics. Would you like to see his projects or work experience?";
    }

    /**
     * Handles search if present in the URL hash.
     */
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
            
            if (typeof switchView === 'function') {
                switchView('search', false);
            }
        }
    }

    /**
     * Parses Markdown into a structured content object.
     * @param {string} markdown Raw markdown text.
     */
    parseContent(markdown) {
        const lines = markdown.split('\n');
        let currentSection = null;
        let currentSubsection = null;
        let currentItem = {};

        const saveCurrentItem = () => {
            if (currentSection && currentSubsection && Object.keys(currentItem).length > 0) {
                if (Array.isArray(this.content[currentSection])) {
                    this.content[currentSection].push({ ...currentItem, title: currentSubsection });
                } else {
                    this.content[currentSection][currentSubsection] = { ...currentItem };
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
                if (!this.content[currentSection]) {
                    this.content[currentSection] = this.ARRAY_SECTIONS.includes(currentSection) ? [] : {};
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
                if (parts.length === 2 && Array.isArray(this.content[currentSection])) {
                    this.content[currentSection].push({
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
                    this.content[currentSection][key] = value;
                }
            } else {
                // Handle text directly under a section or subsection
                if (currentSubsection) {
                    currentItem.description = currentItem.description 
                        ? `${currentItem.description} ${trimmedLine}` 
                        : trimmedLine;
                } else {
                    this.content[currentSection].mainText = this.content[currentSection].mainText 
                        ? `${this.content[currentSection].mainText} ${trimmedLine}` 
                        : trimmedLine;
                }
            }
        }

        saveCurrentItem(); // Final item
    }

    /**
     * Injects the parsed content into the DOM.
     */
    populatePage() {
        this.renderProfile();
        this.renderContact();
        this.renderAbout();
        
        // Professional Core
        this.renderSection('experience', '#experience-container', item => this.createExperienceCard(item));
        this.renderEducation();
        this.buildTimeline();
        
        // Sorting and rendering Projects
        const projects = this.content.projects || [];
        projects.sort((a, b) => this.parseDateRange(b.dates).end - this.parseDateRange(a.dates).end);
        this.renderSection('projects', '#projects-container', item => this.createProjectCard(item));
        
        this.renderSkills();

        // Professional Extensions
        this.renderSection('service', '#service-container', item => this.createExperienceCard(item));
        this.renderSection('volunteer', '#volunteer-container', item => this.createExperienceCard(item));
        this.renderSection('interests', '#interests-container', item => this.createExperienceCard(item));

        // Unified Personal View
        const unifiedContainer = '#personal-unified-container';
        const containerEl = document.querySelector(unifiedContainer);
        if (containerEl) containerEl.innerHTML = ''; // Clear once at start
        
        // Header 1: Library & Resources
        if (containerEl) {
            const h1 = document.createElement('h3');
            h1.className = 'subsection-title';
            h1.style.cssText = 'margin-top: 0; margin-bottom: var(--spacing-sm); width: 100%; border-bottom: 1px solid var(--border-color-light); padding-bottom: 8px;';
            h1.textContent = 'Library & Resources';
            containerEl.appendChild(h1);
        }

        // Other first (Reading List and Resources)
        this.renderSection('reading list', unifiedContainer, item => this.createBookCard(item, 'Reading'), false);
        this.renderResources(unifiedContainer);

        // Header 2: Projects
        if (containerEl) {
            const h2Container = document.createElement('div');
            h2Container.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-lg); margin-bottom: var(--spacing-sm); width: 100%; border-bottom: 1px solid var(--border-color-light); padding-bottom: 8px;';
            
            const h2 = document.createElement('h3');
            h2.className = 'subsection-title';
            h2.style.cssText = 'margin: 0; border: none; padding: 0; width: auto;'; 
            h2.textContent = 'Projects Portfolio';
            
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
            
            containerEl.appendChild(h2Container);
        }

        // Projects below
        const allProjects = [
            ...(this.content.projects || []).map(p => ({ ...p, category: 'Professional' })),
            ...(this.content['personal projects'] || []).map(p => ({ ...p, category: 'Personal' }))
        ];
        allProjects.sort((a, b) => this.parseDateRange(b.dates).end - this.parseDateRange(a.dates).end);
        
        allProjects.forEach(project => {
            if (containerEl) containerEl.appendChild(this.createProjectCard(project, project.category));
        });
    }

    // --- Helper Rendering Methods ---

    renderProfile() {
        const { profile } = this.content;
        if (!profile) return;
        this.setTextContent('.profile-name', profile.name);
        // Split long titles by | for cleaner multi-line presentation
        const titleHTML = (profile.title || '').split('|').map(part => `<span>${part.trim()}</span>`).join('<br>');
        this.setHTML('.profile-title', titleHTML);
        this.setAttr('.profile-photo', 'src', profile.photo);
    }

    renderContact() {
        const { contact } = this.content;
        if (!contact) return;

        const socialLinks = {
            email: contact.email ? `mailto:${contact.email}` : null,
            linkedin: contact.linkedin,
            github: contact.github,
            kaggle: contact.kaggle,
            leetcode: contact.leetcode,
            facebook: contact.facebook,
            venmo: contact.venmo,
            orcid: contact.orcid,
            kattis: contact.kattis,
            'resume-link': contact.resume
        };

        Object.entries(socialLinks).forEach(([key, value]) => {
            if (key === 'resume-link') return this.handleResumeLinks(value);
            
            const el = document.querySelector(`.social-link.${key}`);
            if (el && value && !value.includes('undefined')) {
                el.setAttribute('href', value);
                el.classList.remove('disabled');
                el.style.display = 'flex';
            }
        });

        // Full History link
        const historyUrl = contact.full_history;
        const historyLink = document.querySelector('.full-history-link');
        if (historyLink && historyUrl && !historyUrl.toLowerCase().includes('coming soon')) {
            historyLink.setAttribute('href', historyUrl);
            document.querySelector('#full-history-container').style.display = 'block';
        }

        // Venmo
        document.querySelectorAll('.venmo-btn').forEach(btn => {
            if (contact.venmo) {
                btn.setAttribute('href', contact.venmo);
                btn.style.display = 'inline-flex';
            }
        });
    }

    handleResumeLinks(url) {
        const container = document.querySelector('.resume-combined-link');
        if (!container || !url) return;
        
        container.style.display = 'flex';
        container.title = 'View Resume';
        
        // Add click handler to the container to open the resume view
        container.onclick = (e) => {
            // If the user clicked specifically on an action button, let that handle it
            // We use stopPropagation on the buttons to be extra safe
            window.open(url, '_blank');
        };

        const viewEl = container.querySelector('.resume-view');
        if (viewEl) {
            viewEl.setAttribute('href', url);
            viewEl.onclick = (e) => e.stopPropagation();
        }
        
        const downloadEl = container.querySelector('.resume-download');
        if (downloadEl) {
            let downloadUrl = url;
            const idMatch = url.match(/\/d\/(.+?)\//);
            if (idMatch && idMatch[1]) {
                downloadUrl = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
            }
            downloadEl.setAttribute('href', downloadUrl);
            downloadEl.onclick = (e) => e.stopPropagation();
        }
    }

    renderAbout() {
        const { about } = this.content;
        if (!about) return;

        if (about.mainText) this.setHTML('#about .section-description', about.mainText);

        const extendedKey = Object.keys(about).find(k => k.toLowerCase() === 'extended');
        if (extendedKey) {
            const extended = about[extendedKey];
            const content = typeof extended === 'string' ? extended : (extended.description || '');
            this.setHTML('#aboutAdditional .section-description', content);
            document.querySelector('#about .btn-secondary').style.display = 'inline-block';
        }
    }

    renderEducation() {
        const { education } = this.content;
        if (!education) return;
        
        const container = document.querySelector('#education-container');
        if (!container) return;
        
        container.innerHTML = '';
        Object.keys(education).forEach(key => {
            if (key === 'mainText') return;
            const edu = education[key];
            const card = this.createEducationCard({ ...edu, degree: key });
            container.appendChild(card);
        });
    }

    renderSkills() {
        const { skills } = this.content;
        const container = document.querySelector('.skills-grid');
        if (!skills || !container) return;
        
        container.innerHTML = '';
        Object.keys(skills).forEach(category => {
            container.appendChild(this.createSkillCategory(category, skills[category]));
        });
    }

    renderResources(customContainer = null) {
        const resources = this.content.resources;
        if (!Array.isArray(resources)) return;

        const container = customContainer ? document.querySelector(customContainer) : document.querySelector('#featured-resources-container');
        if (!container) return;

        if (!customContainer) {
            container.innerHTML = '';
        }
        
        resources.forEach(res => {
            container.appendChild(this.createResourceCard(res, 'Resource'));
        });
    }

    /**
     * Generic renderer for array-based sections.
     */
    renderSection(key, selector, cardCreator, clearContainer = true) {
        const items = this.content[key];
        const container = document.querySelector(selector);
        if (!Array.isArray(items) || !container) return;
        
        if (clearContainer) container.innerHTML = '';
        items.forEach(item => container.appendChild(cardCreator(item)));
    }

    // --- Card Creators ---

    addHoverListeners(el, slug) {
        // Only add hover listeners if the device supports hover
        if (window.matchMedia("(hover: hover)").matches) {
            el.onmouseenter = () => {
                const bar = document.getElementById(`timeline-bar-${slug}`);
                if (bar) {
                    bar.classList.add('highlight-bar');
                    // Calculate position to avoid scrolling the main page
                    const stickyContainer = document.querySelector('.timeline-sticky');
                    const timelineContainer = document.getElementById('timeline-container');
                    if (stickyContainer && timelineContainer) {
                        const scrollPos = bar.offsetTop + timelineContainer.offsetTop - (stickyContainer.offsetHeight / 2) + (bar.offsetHeight / 2);
                        stickyContainer.scrollTo({ top: scrollPos, behavior: 'smooth' });
                    }
                }
            };
            el.onmouseleave = () => {
                const bar = document.getElementById(`timeline-bar-${slug}`);
                if (bar) bar.classList.remove('highlight-bar');
            };
        }
    }

    createExperienceCard(exp) {
        const card = document.createElement('div');
        const slug = this.slugify(exp.title);
        card.className = 'card';
        card.id = `card-${slug}`;
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="card-title">${exp.title}</h3>
                    <p class="card-subtitle">${exp.company || ''}</p>
                </div>
                <div class="card-meta">${exp.dates || ''}</div>
            </div>
            <p class="card-description">${exp.description || ''}</p>
            ${this.renderTags(exp.tags)}
        `;
        this.addHoverListeners(card, slug);
        return card;
    }

    createEducationCard(edu) {
        const coursework = edu.coursework ? edu.coursework.split(this.TAG_SPLIT_REGEX).map(c => c.trim()) : [];
        const card = document.createElement('div');
        const slug = this.slugify(edu.degree);
        card.className = 'education-card';
        card.id = `card-${slug}`;
        card.innerHTML = `
            <div class="education-header">
                <h3 class="degree-title">${edu.degree}</h3>
                <p class="university">${edu.institution || ''}</p>
                <p class="education-meta">${edu.dates ? edu.dates : `Graduating ${edu.graduation || ''}`} | GPA: ${edu.gpa || ''}</p>
            </div>
            <div class="education-details">
                ${edu.emphasis ? `<p><strong>Emphasis:</strong> ${edu.emphasis}</p>` : ''}
                ${edu.minor ? `<p><strong>Minor:</strong> ${edu.minor}</p>` : ''}
                ${edu.honors ? `
                    <p><strong>Honors:</strong></p>
                    <ul class="honors-list">${edu.honors.split(this.TAG_SPLIT_REGEX).map(h => `<li>${h.trim()}</li>`).join('')}</ul>
                ` : ''}
                ${coursework.length > 0 ? `
                    <p><strong>Key Coursework:</strong></p>
                    <ul>${coursework.map(c => `<li>${c}</li>`).join('')}</ul>
                ` : ''}
            </div>
        `;
        this.addHoverListeners(card, slug);
        return card;
    }

    createProjectCard(project, category = null) {
        const card = document.createElement('div');
        const slug = this.slugify(project.title);
        card.className = project.image ? 'project-card' : 'card';
        card.id = `card-${slug}`;

        let statusHTML = '';
        if (project.status) {
            const statusText = project.status === 'in-development' ? 'In Development' : 
                             project.status === 'personal-use' ? 'Personal Use' :
                             project.status.charAt(0).toUpperCase() + project.status.slice(1);
            if (project.status.toLowerCase() !== 'live') {
                statusHTML = `<p class="project-status-note" style="margin-top: 4px; font-size: 0.7rem;">${statusText}${project.note ? ` (${project.note})` : ''}</p>`;
            }
        }

        const categoryTag = category ? `<span class="skill-tag category-badge" style="background: var(--primary-blue); color: white; border: none;">${category}</span>` : '';

        const content = `
            <div class="card-header" style="margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 class="card-title">${project.title}</h3>
                    ${categoryTag}
                </div>
                ${project.dates ? `<div class="card-meta" style="font-size: 0.75rem;">${project.dates}</div>` : ''}
            </div>
            <p class="card-description" style="margin-bottom: 12px; font-size: 0.85rem;">${project.description || ''}</p>
            ${this.renderTags(project.tags)}
            <div class="project-actions" style="margin-top: 8px; padding-top: 8px;">
                ${project.link ? `<a href="${project.link}" target="_blank" class="btn btn-primary" style="padding: 4px 8px; font-size: 0.75rem;">View →</a>` : ''}
                ${statusHTML}
            </div>
        `;

        card.innerHTML = project.image 
            ? `<img src="${project.image}" alt="${project.title}" class="project-image"><div class="project-card-content">${content}</div>`
            : content;
        
        this.addHoverListeners(card, slug);
        return card;
    }

    createSkillCategory(category, skillData) {
        const div = document.createElement('div');
        div.className = 'skill-category';
        const rawSkills = typeof skillData === 'string' ? skillData : (skillData.description || '');
        const skillList = rawSkills.split(this.TAG_SPLIT_REGEX).map(s => s.trim()).filter(s => s);
        div.innerHTML = `
            <h3 class="skill-category-title">${category}</h3>
            <div class="skill-list">
                ${skillList.map(skill => `<div class="skill-item">${skill}</div>`).join('')}
            </div>
        `;
        return div;
    }

    createBookCard(book, defaultCategory = null) {
        const card = document.createElement('div');
        card.className = 'book-card card';
        const badgeText = book.tags ? book.tags.split(this.TAG_SPLIT_REGEX)[0].trim() : defaultCategory;
        const categoryTag = badgeText ? `<span class="skill-tag category-badge" style="background: var(--accent-purple); color: white; border: none;">${badgeText}</span>` : '';
        const badgeHTML = book.status ? `<div class="book-badge" style="position: static; margin-left: auto;">${book.status}</div>` : '';
        card.innerHTML = `
            <div class="card-header" style="justify-content: flex-start; gap: 12px;">
                <h3 class="card-title">${book.title}</h3>
                ${categoryTag}
                ${badgeHTML}
            </div>
            <p class="card-subtitle">${book.author || ''}</p>
            <p class="card-description">${book.description || ''}</p>
        `;
        return card;
    }

    createResourceCard(resource, defaultCategory = null) {
        const card = document.createElement('div');
        card.className = 'card';
        const badgeText = resource.tags ? resource.tags.split(this.TAG_SPLIT_REGEX)[0].trim() : defaultCategory;
        const categoryTag = badgeText ? `<span class="skill-tag category-badge" style="background: #10b981; color: white; border: none;">${badgeText}</span>` : '';
        const link = resource.url || resource.link;
        card.innerHTML = `
            <div class="card-header" style="justify-content: flex-start; gap: 12px;">
                <h3 class="card-title">${resource.name || resource.title}</h3>
                ${categoryTag}
                ${link ? `<a href="${link}" target="_blank" style="margin-left: auto; color: var(--primary-blue);"><svg class="icon icon-stroke" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg></a>` : ''}
            </div>
            <p class="card-description">${resource.description || ''}</p>
        `;
        return card;
    }

    // --- Utilities ---

    renderTags(tagStr) {
        if (!tagStr) return '';
        const tags = tagStr.split(this.TAG_SPLIT_REGEX).map(t => t.trim());
        return `<div class="card-tags">${tags.map(t => `
            <a href="#/professional/search?tag=${encodeURIComponent(t)}" class="skill-tag" onclick="event.preventDefault(); window.location.hash = '/professional/search?tag=${encodeURIComponent(t)}';">${t}</a>
        `).join('')}</div>`;
    }

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

    slugify(text) {
        return (text || '').toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
    }

    setTextContent(sel, txt) { const el = document.querySelector(sel); if (el) el.textContent = txt; }
    setHTML(sel, html) { const el = document.querySelector(sel); if (el) el.innerHTML = html; }
    setAttr(sel, attr, val) { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); }

    /**
     * Builds the visual timeline sidebar.
     */
    buildTimeline() {
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
        if (this.content.experience) this.content.experience.forEach(exp => {
            const range = this.parseDateRange(exp.dates);
            const category = getCategory(exp.title, 'job');
            items.push({ ...range, dateLabel: exp.dates, title: exp.title, org: exp.company, category, targetId: `card-${this.slugify(exp.title)}` });
        });

        // Add Education
        if (this.content.education) Object.entries(this.content.education).forEach(([title, edu]) => {
            if (title === 'mainText' || typeof edu !== 'object') return;
            const range = this.parseDateRange(edu.dates || edu.graduation);
            const slug = this.slugify(title);
            items.push({ ...range, dateLabel: edu.dates || edu.graduation, title, org: edu.institution, category: 'education', targetId: `card-${slug}` });
        });

        // Add Projects
        if (this.content.projects) this.content.projects.forEach(proj => {
            const range = this.parseDateRange(proj.dates);
            if (range.start > 0) {
                const slug = this.slugify(proj.title);
                items.push({ ...range, dateLabel: proj.dates, title: proj.title, org: 'Project', category: 'project', targetId: `card-${slug}` });
            }
        });

        const addActivity = (list, defaultCat) => {
            if (list) list.forEach(item => {
                const range = this.parseDateRange(item.dates);
                if (range.start > 0) {
                    const category = getCategory(item.title, defaultCat);
                    items.push({ ...range, dateLabel: item.dates, title: item.title, org: item.company || item.location, category, targetId: `card-${this.slugify(item.title)}` });
                }
            });
        };
        addActivity(this.content.service, 'volunteer');
        addActivity(this.content.volunteer, 'volunteer');

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
            const slug = this.slugify(item.title);
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

document.addEventListener('DOMContentLoaded', () => {
    window.contentLoader = new ContentLoader();
    window.contentLoader.load();
});
