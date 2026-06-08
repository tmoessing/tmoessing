/**
 * Renderer module for creating and injecting DOM elements.
 */
export class Renderer {
    constructor(parser) {
        this.parser = parser;
    }

    /**
     * Helper to set text content of an element.
     */
    setTextContent(sel, txt) { 
        const el = document.querySelector(sel); 
        if (el) el.textContent = txt; 
    }

    /**
     * Helper to set HTML content of an element.
     */
    setHTML(sel, html) { 
        const el = document.querySelector(sel); 
        if (el) el.innerHTML = html; 
    }

    /**
     * Helper to set attribute of an element.
     */
    setAttr(sel, attr, val) { 
        const el = document.querySelector(sel); 
        if (el) el.setAttribute(attr, val); 
    }

    renderProfile(profile) {
        if (!profile) return;
        this.setTextContent('.profile-name', profile.name);
        const titleHTML = (profile.title || '').split('|').map(part => `<span>${part.trim()}</span>`).join('');
        this.setHTML('.profile-title', titleHTML);
        this.setAttr('.profile-photo', 'src', profile.photo);
    }

    renderContact(contact) {
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
        
        container.onclick = (e) => {
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

    renderAbout(about) {
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

    renderEducation(education) {
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

    renderSkills(skills) {
        const container = document.querySelector('.skills-grid');
        if (!skills || !container) return;
        
        container.innerHTML = '';
        Object.keys(skills).forEach(category => {
            container.appendChild(this.createSkillCategory(category, skills[category]));
        });
    }

    renderResources(resources, customContainer = null) {
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

    renderSection(items, selector, cardCreator, clearContainer = true) {
        const container = document.querySelector(selector);
        if (!Array.isArray(items) || !container) return;
        
        if (clearContainer) container.innerHTML = '';
        items.forEach(item => container.appendChild(cardCreator.call(this, item)));
    }

    // --- Card Creators ---

    addHoverListeners(el, slug) {
        if (window.matchMedia("(hover: hover)").matches) {
            el.onmouseenter = () => {
                const bar = document.getElementById(`timeline-bar-${slug}`);
                if (bar) {
                    bar.classList.add('highlight-bar');
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
        const slug = this.parser.slugify(exp.title);
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
        const coursework = edu.coursework ? edu.coursework.split(this.parser.TAG_SPLIT_REGEX).map(c => c.trim()) : [];
        const card = document.createElement('div');
        const slug = this.parser.slugify(edu.degree);
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
                    <ul class="honors-list">${edu.honors.split(this.parser.TAG_SPLIT_REGEX).map(h => `<li>${h.trim()}</li>`).join('')}</ul>
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
        const slug = this.parser.slugify(project.title);
        card.className = project.image ? 'card has-image project-card' : 'card project-card';
        card.id = `card-${slug}`;

        let statusHTML = '';
        if (project.status) {
            const statusText = project.status === 'in-development' ? 'In Development' : 
                             project.status === 'personal-use' ? 'Personal Use' :
                             project.status.charAt(0).toUpperCase() + project.status.slice(1);
            if (project.status.toLowerCase() !== 'live') {
                statusHTML = `<p class="project-status-note">${statusText}${project.note ? ` (${project.note})` : ''}</p>`;
            }
        }

        const catStyle = category ? this.getTagStyle(category) : null;
        const categoryTag = category ? `<span class="skill-tag category-badge" style="background: ${catStyle.bg}; color: white; border: none;">${category.toUpperCase()}</span>` : '';

        const content = `
            <div class="card-header">
                <div class="card-title-container">
                    <h3 class="card-title">${project.title}</h3>
                    ${categoryTag}
                </div>
                ${project.dates ? `<div class="card-meta">${project.dates}</div>` : ''}
            </div>
            <p class="card-description">${project.description || ''}</p>
            <div class="project-actions">
                ${project.link ? `<a href="${project.link}" target="_blank" class="btn btn-primary btn-sm">View →</a>` : ''}
                ${statusHTML}
            </div>
            <div class="card-footer">
                ${this.renderTags(project.tags)}
            </div>
        `;

        if (project.image) {
            card.innerHTML = `
                <div class="card-image-container">
                    <img src="${project.image}" alt="${project.title}" class="card-image project-card-image">
                </div>
                <div class="card-content-with-image">
                    ${content}
                </div>
            `;
        } else {
            card.innerHTML = content;
        }
        
        this.addHoverListeners(card, slug);
        return card;
    }

    createSkillCategory(category, skillData) {
        const div = document.createElement('div');
        div.className = 'skill-category';
        const rawSkills = typeof skillData === 'string' ? skillData : (skillData.description || '');
        const skillList = rawSkills.split(this.parser.TAG_SPLIT_REGEX).map(s => s.trim()).filter(s => s);
        div.innerHTML = `
            <h3 class="skill-category-title">${category}</h3>
            <div class="skill-list">
                ${skillList.map(skill => `<div class="skill-item">${skill.toUpperCase()}</div>`).join('')}
            </div>
        `;
        return div;
    }

    createResourceCard(resource, defaultCategory = null) {
        const card = document.createElement('div');
        const slug = this.parser.slugify(resource.name || resource.title);
        card.className = resource.image ? 'card has-image' : 'card';
        card.id = `card-${slug}`;

        const link = resource.url || resource.link;
        
        let statusBadge = '';
        if (resource.status === 'coming-soon') {
            statusBadge = `<span class="skill-tag category-badge coming-soon">COMING SOON</span>`;
        }
        
        const content = `
            <div class="card-header resource-header">
                <h3 class="card-title">${resource.name || resource.title}</h3>
                ${statusBadge}
                ${link ? `<a href="${link}" target="_blank" class="resource-link-icon"><svg class="icon icon-stroke" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg></a>` : ''}
            </div>
            <p class="card-description">${resource.description || ''}</p>
            <div class="card-footer">
                ${this.renderTags(resource.tags)}
            </div>
        `;

        if (resource.image) {
            card.innerHTML = `
                <div class="card-image-container">
                    <img src="${resource.image}" alt="${resource.name || resource.title}" class="card-image resource-logo">
                </div>
                <div class="card-content-with-image">
                    ${content}
                </div>
            `;
        } else {
            card.innerHTML = content;
        }

        return card;
    }

    renderTags(tagStr) {
        if (!tagStr) return '';
        const tags = tagStr.split(this.parser.TAG_SPLIT_REGEX).map(t => t.trim());
        return `<div class="card-tags">${tags.map(t => {
            const style = this.getTagStyle(t);
            return `<a href="#/professional/search?tag=${encodeURIComponent(t)}" 
               class="skill-tag" 
               style="background: ${style.bg}; color: ${style.text}; border-color: transparent;"
               onclick="event.preventDefault(); window.location.hash = '/professional/search?tag=${encodeURIComponent(t)}';">${t.toUpperCase()}</a>`;
        }).join('')}</div>`;
    }

    getTagStyle(tagName) {
        if (!tagName) return { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)' };
        
        const tag = tagName.toLowerCase().trim();
        
        // Specific category colors
        if (tag === 'life hack') return { bg: 'var(--color-life-hack)', text: '#fff' };
        if (tag === 'book') return { bg: 'var(--color-book)', text: '#fff' };
        if (tag === 'photos') return { bg: 'var(--color-photos)', text: '#fff' };
        if (tag === 'podcast') return { bg: 'var(--color-podcast)', text: '#fff' };
        if (tag === 'self-help') return { bg: 'var(--color-self-help)', text: '#fff' };
        if (tag === 'tech') return { bg: 'var(--color-tech)', text: '#fff' };
        if (tag === 'dev') return { bg: 'var(--color-dev)', text: '#fff' };
        if (tag === 'humor') return { bg: 'var(--color-humor)', text: '#fff' };

        // Simple hash function to get a consistent index
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) {
            hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const index = (Math.abs(hash) % 8) + 1; // 1-8 based on our variables
        return {
            bg: `var(--tag-${index}-bg)`,
            text: `var(--tag-${index}-text)`
        };
    }
}
