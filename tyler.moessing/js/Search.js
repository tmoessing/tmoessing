/**
 * Search module for handling search functionality, tag generation, and AI logic.
 */
export class Search {
    constructor(parser, renderer) {
        this.parser = parser;
        this.renderer = renderer;
        this.searchableItems = [];
        this.allTags = new Set();
    }

    /**
     * Collects all relevant items into a single searchable array and gathers unique tags.
     */
    collectSearchableItems(content) {
        this.searchableItems = [];
        this.allTags = new Set();
        
        const addItems = (section, category) => {
            const items = content[section];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    this.searchableItems.push({ 
                        ...item, 
                        category: category,
                        section: section
                    });
                    if (item.tags) {
                        item.tags.split(this.parser.TAG_SPLIT_REGEX).forEach(t => this.allTags.add(t.trim()));
                    }
                });
            } else if (typeof items === 'object') {
                Object.entries(items).forEach(([title, details]) => {
                    if (title === 'mainText' || typeof details !== 'object') return;
                    this.searchableItems.push({ 
                        ...details, 
                        title: title,
                        category: category, section: section
                    });
                    if (details.tags) {
                        details.tags.split(this.parser.TAG_SPLIT_REGEX).forEach(t => this.allTags.add(t.trim()));
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
        addItems('resources', 'resource');
        
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
            <div class="suggested-tags-section">
                <h3 class="suggested-tags-title">Explore by Tag</h3>
                <div class="card-tags suggested-tags-cloud">
                    ${Array.from(this.allTags).map(t => `
                        <a href="#/professional/search?tag=${encodeURIComponent(t)}" class="skill-tag suggested-tag-btn" onclick="event.preventDefault(); document.querySelector('#search-input').value = '${t}'; window.location.hash = '/professional/search?tag=${encodeURIComponent(t)}'; window.contentLoader.performSearch('${t}');">${t.toUpperCase()}</a>
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
                card = this.renderer.createEducationCard(item);
            } else if (item.section === 'projects' || item.section === 'personal projects') {
                card = this.renderer.createProjectCard(item);
            } else if (item.section === 'resources') {
                card = this.renderer.createResourceCard(item, 'Resource');
            } else {
                card = this.renderer.createExperienceCard(item);
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

        input.value = '';

        const userMsg = document.createElement('div');
        userMsg.className = 'chat-message user-message';
        userMsg.textContent = query;
        chatContainer.appendChild(userMsg);

        chatContainer.scrollTop = chatContainer.scrollHeight;

        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-message ai-message';
            
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
}
