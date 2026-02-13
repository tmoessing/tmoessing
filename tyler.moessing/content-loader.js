// Content Loader - Parses content.md and populates the resume
class ContentLoader {
    constructor() {
        this.content = {};
    }

    async load() {
        try {
            const response = await fetch('content.md');
            const text = await response.text();
            this.parseContent(text);
            this.populatePage();
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }

    parseContent(markdown) {
        const lines = markdown.split('\n');
        let currentSection = null;
        let currentSubsection = null;
        let currentItem = {};

        for (let line of lines) {
            line = line.trim();

            // Main section headers (## Section)
            if (line.startsWith('## ') && !line.startsWith('### ')) {
                currentSection = line.replace('## ', '').toLowerCase();
                if (!this.content[currentSection]) {
                    this.content[currentSection] = currentSection === 'experience' ||
                        currentSection === 'projects' ||
                        currentSection === 'interests' ? [] : {};
                }
                currentSubsection = null;
                currentItem = {};
                continue;
            }

            // Subsection headers (### Subsection)
            if (line.startsWith('### ')) {
                // Save previous item if exists
                if (currentSubsection && Object.keys(currentItem).length > 0) {
                    if (Array.isArray(this.content[currentSection])) {
                        this.content[currentSection].push({ ...currentItem, title: currentSubsection });
                    } else {
                        this.content[currentSection][currentSubsection] = { ...currentItem };
                    }
                }

                currentSubsection = line.replace('### ', '');
                currentItem = {};
                continue;
            }

            // Key-value pairs (key: value)
            if (line.includes(':') && currentSection) {
                const colonIndex = line.indexOf(':');
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();

                if (currentSubsection) {
                    currentItem[key] = value;
                } else {
                    this.content[currentSection][key] = value;
                }
                continue;
            }

            // List items
            if (line.startsWith('- ') && currentSection === 'interests') {
                const parts = line.substring(2).split('|');
                if (parts.length === 2) {
                    if (!this.content[currentSection].resources) {
                        this.content[currentSection].resources = [];
                    }
                    this.content[currentSection].resources.push({
                        name: parts[0].trim(),
                        url: parts[1].trim()
                    });
                }
            }
        }

        // Save last item
        if (currentSubsection && Object.keys(currentItem).length > 0) {
            if (Array.isArray(this.content[currentSection])) {
                this.content[currentSection].push({ ...currentItem, title: currentSubsection });
            } else {
                this.content[currentSection][currentSubsection] = { ...currentItem };
            }
        }
    }

    populatePage() {
        // Profile
        if (this.content.profile) {
            this.setTextContent('.profile-name', this.content.profile.name);
            this.setTextContent('.profile-title', this.content.profile.title);
            this.setAttr('.profile-photo', 'src', this.content.profile.photo);
        }

        // Contact
        if (this.content.contact) {
            this.setAttr('a.email', 'href', `mailto:${this.content.contact.email}`);
            this.setAttr('a.linkedin', 'href', this.content.contact.linkedin);
            this.setAttr('a.github', 'href', this.content.contact.github);
            this.setAttr('a.facebook', 'href', this.content.contact.facebook);
            this.setAttr('.donut-btn', 'href', this.content.contact.venmo);
        }

        // About
        if (this.content.about) {
            const aboutText = Object.keys(this.content.about)
                .filter(key => key !== 'Extended')
                .map(key => this.content.about[key])
                .join('\n\n');
            this.setHTML('#about .section-description', aboutText);

            if (this.content.about.Extended) {
                this.setHTML('#aboutAdditional .section-description', this.content.about.Extended);
            }
        }

        // Experience
        if (this.content.experience && Array.isArray(this.content.experience)) {
            const container = document.querySelector('#experience');
            const existingCards = container.querySelectorAll('.card');
            existingCards.forEach(card => card.remove());

            this.content.experience.forEach(exp => {
                const card = this.createExperienceCard(exp);
                container.appendChild(card);
            });
        }

        // Education
        if (this.content.education) {
            const educationSection = document.querySelector('#education');
            const cards = educationSection.querySelectorAll('.education-card, .card');
            cards.forEach(card => card.remove());

            Object.keys(this.content.education).forEach(key => {
                const edu = this.content.education[key];
                const card = key.includes('Research') ?
                    this.createResearchCard({ ...edu, title: key }) :
                    this.createEducationCard({ ...edu, degree: key });
                educationSection.appendChild(card);
            });
        }

        // Projects
        if (this.content.projects && Array.isArray(this.content.projects)) {
            const container = document.querySelector('#projects');
            const existingCards = container.querySelectorAll('.project-card, .card');
            existingCards.forEach(card => card.remove());

            this.content.projects.forEach(project => {
                const card = this.createProjectCard(project);
                container.appendChild(card);
            });
        }

        // Skills
        if (this.content.skills) {
            const container = document.querySelector('.skills-grid');
            container.innerHTML = '';

            Object.keys(this.content.skills).forEach(category => {
                const skillDiv = this.createSkillCategory(category, this.content.skills[category]);
                container.appendChild(skillDiv);
            });
        }

        // Interests
        if (this.content.interests) {
            const container = document.querySelector('#interests');
            const existingCards = container.querySelectorAll('.card');
            existingCards.forEach(card => card.remove());

            this.content.interests.forEach(interest => {
                const card = this.createInterestCard(interest);
                container.appendChild(card);
            });

            // Add resources card if exists
            if (this.content.interests.resources) {
                const resourceCard = this.createResourceCard(this.content.interests.resources);
                container.appendChild(resourceCard);
            }
        }
    }

    createExperienceCard(exp) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="card-title">${exp.title}</h3>
                    <p class="card-subtitle">${exp.company}</p>
                </div>
                <div class="card-meta">${exp.dates}</div>
            </div>
            <p class="card-description">${exp.description}</p>
            ${exp.tags ? `<div class="card-tags">${exp.tags.split(',').map(tag =>
            `<span class="skill-tag">${tag.trim()}</span>`).join('')}</div>` : ''}
        `;
        return card;
    }

    createEducationCard(edu) {
        const coursework = edu.coursework ? edu.coursework.split(',').map(c => c.trim()) : [];
        const card = document.createElement('div');
        card.className = 'education-card';
        card.innerHTML = `
            <div class="education-header">
                <h3 class="degree-title">${edu.degree}</h3>
                <p class="university">${edu.institution}</p>
                <p class="education-meta">Graduating ${edu.graduation} | GPA: ${edu.gpa}</p>
            </div>
            <div class="education-details">
                ${edu.emphasis ? `<p><strong>Emphasis:</strong> ${edu.emphasis}</p>` : ''}
                ${edu.minor ? `<p><strong>Minor:</strong> ${edu.minor}</p>` : ''}
                ${edu.honors ? `<p><strong>Honors:</strong> ${edu.honors}</p>` : ''}
                ${coursework.length > 0 ? `
                    <p><strong>Key Coursework:</strong></p>
                    <ul>${coursework.map(c => `<li>${c}</li>`).join('')}</ul>
                ` : ''}
            </div>
        `;
        return card;
    }

    createResearchCard(research) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="card-title">${research.title}</h3>
                    <p class="card-subtitle">${research.institution}</p>
                </div>
                <div class="card-meta">${research.dates}</div>
            </div>
            <p class="card-description">${research.description}</p>
            ${research.tags ? `<div class="card-tags">${research.tags.split(',').map(tag =>
            `<span class="skill-tag">${tag.trim()}</span>`).join('')}</div>` : ''}
        `;
        return card;
    }

    createProjectCard(project) {
        const hasImage = project.image;
        const card = document.createElement('div');
        card.className = hasImage ? 'project-card' : 'card';

        let statusHTML = '';
        if (project.status === 'in-development') {
            statusHTML = `<p style="color: var(--text-muted); font-style: italic; margin-top: 12px;">In Development${project.note ? ` (${project.note})` : ''}</p>`;
        }

        card.innerHTML = hasImage ? `
            <img src="${project.image}" alt="${project.title}" class="project-image">
            <div class="project-card-content">
                <h3 class="card-title">${project.title}</h3>
                <p class="card-description">${project.description}</p>
                ${project.tags ? `<div class="card-tags">${project.tags.split(',').map(tag =>
            `<span class="skill-tag">${tag.trim()}</span>`).join('')}</div>` : ''}
                <div class="project-actions">
                    ${project.link ? `<a href="${project.link}" target="_blank" class="btn btn-primary">View Project →</a>` : ''}
                    ${statusHTML}
                </div>
            </div>
        ` : `
            <h3 class="card-title">${project.title}</h3>
            <p class="card-description">${project.description}</p>
            ${project.tags ? `<div class="card-tags">${project.tags.split(',').map(tag =>
                `<span class="skill-tag">${tag.trim()}</span>`).join('')}</div>` : ''}
            ${statusHTML}
        `;
        return card;
    }

    createSkillCategory(category, skills) {
        const div = document.createElement('div');
        div.className = 'skill-category';
        const skillList = skills.split(',').map(s => s.trim());
        div.innerHTML = `
            <h3 class="skill-category-title">${category}</h3>
            <div class="skill-list">
                ${skillList.map(skill => `<div class="skill-item">${skill}</div>`).join('')}
            </div>
        `;
        return div;
    }

    createInterestCard(interest) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3 class="card-title">${interest.title || interest.description?.split(':')[0]}</h3>
            <p class="card-description">${interest.description}</p>
        `;
        return card;
    }

    createResourceCard(resources) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3 class="card-title">Helpful Resources</h3>
            <p class="card-description" style="margin-bottom: 8px;">Tyler recommends these useful services:</p>
            <div class="project-actions">
                ${resources.map(r => `<a href="${r.url}" target="_blank" class="btn btn-secondary">${r.name}</a>`).join('')}
            </div>
        `;
        return card;
    }

    setTextContent(selector, text) {
        const el = document.querySelector(selector);
        if (el && text) el.textContent = text;
    }

    setHTML(selector, html) {
        const el = document.querySelector(selector);
        if (el && html) el.innerHTML = html;
    }

    setAttr(selector, attr, value) {
        const el = document.querySelector(selector);
        if (el && value) el.setAttribute(attr, value);
    }
}

// Initialize content loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const loader = new ContentLoader();
    loader.load();
});
