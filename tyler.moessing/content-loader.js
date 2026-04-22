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
                currentSection = trimmedLine.replace('## ', '').toLowerCase();
                if (!this.content[currentSection]) {
                    this.content[currentSection] = ['experience', 'projects', 'interests'].includes(currentSection) ? [] : {};
                }
                currentSubsection = null;
                continue;
            }

            // Subsection headers (### Subsection)
            if (trimmedLine.startsWith('### ')) {
                saveCurrentItem();
                currentSubsection = trimmedLine.replace('### ', '');
                continue;
            }

            if (!currentSection) continue;

            // List items for resources
            if (trimmedLine.startsWith('- ') && currentSection === 'interests') {
                const parts = trimmedLine.substring(2).split('|');
                if (parts.length === 2) {
                    if (!this.content[currentSection].resources) {
                        this.content[currentSection].resources = [];
                    }
                    this.content[currentSection].resources.push({
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
                const text = trimmedLine;
                if (currentSubsection) {
                    if (!currentItem.description) {
                        currentItem.description = text;
                    } else {
                        currentItem.description += ' ' + text;
                    }
                } else {
                    // Text directly under a section (like About)
                    if (!this.content[currentSection].mainText) {
                        this.content[currentSection].mainText = text;
                    } else {
                        this.content[currentSection].mainText += ' ' + text;
                    }
                }
            }
        }

        // Save last item
        saveCurrentItem();
    }

    populatePage() {
        // Profile
        if (this.content.profile) {
            this.setTextContent('.profile-name', this.content.profile.name);
            this.setTextContent('.profile-title', this.content.profile.title);
            this.setAttr('.profile-photo', 'src', this.content.profile.photo);
        }

        // Contact & Social Links
        if (this.content.contact) {
            const socialLinks = {
                email: this.content.contact.email ? `mailto:${this.content.contact.email}` : null,
                linkedin: this.content.contact.linkedin,
                github: this.content.contact.github,
                kaggle: this.content.contact.kaggle,
                leetcode: this.content.contact.leetcode,
                facebook: this.content.contact.facebook
            };

            Object.entries(socialLinks).forEach(([key, value]) => {
                const el = document.querySelector(`.social-link.${key}`);
                if (el && value && !value.includes('undefined')) {
                    el.setAttribute('href', value);
                    el.style.display = 'flex';
                }
            });

            // Handle Venmo button
            const venmoBtn = document.querySelector('.venmo-btn');
            if (venmoBtn && this.content.contact.venmo) {
                venmoBtn.setAttribute('href', this.content.contact.venmo);
                venmoBtn.style.display = 'inline-flex';
            }
        }

        // About
        if (this.content.about) {
            if (this.content.about.mainText) {
                this.setHTML('#about .section-description', this.content.about.mainText);
            }

            // Extended content check
            const extendedKey = Object.keys(this.content.about).find(k => k.toLowerCase() === 'extended');
            if (extendedKey) {
                const extended = this.content.about[extendedKey];
                const extendedContent = typeof extended === 'string' ? extended : (extended.description || '');
                this.setHTML('#aboutAdditional .section-description', extendedContent);
                const readMoreBtn = document.querySelector('#about .btn-secondary');
                if (readMoreBtn) readMoreBtn.style.display = 'inline-block';
            }
        }

        // Experience
        if (this.content.experience && Array.isArray(this.content.experience)) {
            const container = document.querySelector('#experience-container');
            if (container) {
                container.innerHTML = '';
                this.content.experience.forEach(exp => {
                    container.appendChild(this.createExperienceCard(exp));
                });
            }
        }

        // Education
        if (this.content.education) {
            const container = document.querySelector('#education-container');
            if (container) {
                container.innerHTML = '';
                Object.keys(this.content.education).forEach(key => {
                    const edu = this.content.education[key];
                    const card = key.toLowerCase().includes('research') ?
                        this.createResearchCard({ ...edu, title: key }) :
                        this.createEducationCard({ ...edu, degree: key });
                    container.appendChild(card);
                });
            }
        }

        // Projects
        if (this.content.projects && Array.isArray(this.content.projects)) {
            const container = document.querySelector('#projects-container');
            if (container) {
                container.innerHTML = '';
                this.content.projects.forEach(project => {
                    container.appendChild(this.createProjectCard(project));
                });
            }
        }

        // Skills
        if (this.content.skills) {
            const container = document.querySelector('.skills-grid');
            if (container) {
                container.innerHTML = '';
                Object.keys(this.content.skills).forEach(category => {
                    container.appendChild(this.createSkillCategory(category, this.content.skills[category]));
                });
            }
        }

        // Interests
        if (this.content.interests) {
            const container = document.querySelector('#interests-container');
            if (container) {
                container.innerHTML = '';
                this.content.interests.forEach(interest => {
                    container.appendChild(this.createInterestCard(interest));
                });

                if (this.content.interests.resources) {
                    container.appendChild(this.createResourceCard(this.content.interests.resources));
                }
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
                    <p class="card-subtitle">${exp.company || ''}</p>
                </div>
                <div class="card-meta">${exp.dates || ''}</div>
            </div>
            <p class="card-description">${exp.description || ''}</p>
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
                <p class="university">${edu.institution || ''}</p>
                <p class="education-meta">Graduating ${edu.graduation || ''} | GPA: ${edu.gpa || ''}</p>
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
                    <p class="card-subtitle">${research.institution || ''}</p>
                </div>
                <div class="card-meta">${research.dates || ''}</div>
            </div>
            <p class="card-description">${research.description || ''}</p>
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
        if (project.status) {
            const statusText = project.status === 'in-development' ? 'In Development' : 
                             project.status === 'personal-use' || project.status === 'personal use' ? 'Personal Use' :
                             project.status.charAt(0).toUpperCase() + project.status.slice(1);
            
            if (project.status.toLowerCase() !== 'live') {
                statusHTML = `<p style="color: var(--text-muted); font-style: italic; margin-top: 12px;">${statusText}${project.note ? ` (${project.note})` : ''}</p>`;
            }
        }

        card.innerHTML = hasImage ? `
            <img src="${project.image}" alt="${project.title}" class="project-image">
            <div class="project-card-content">
                <h3 class="card-title">${project.title}</h3>
                <p class="card-description">${project.description || ''}</p>
                ${project.tags ? `<div class="card-tags">${project.tags.split(',').map(tag =>
            `<span class="skill-tag">${tag.trim()}</span>`).join('')}</div>` : ''}
                <div class="project-actions">
                    ${project.link ? `<a href="${project.link}" target="_blank" class="btn btn-primary">View Project →</a>` : ''}
                    ${statusHTML}
                </div>
            </div>
        ` : `
            <h3 class="card-title">${project.title}</h3>
            <p class="card-description">${project.description || ''}</p>
            ${project.tags ? `<div class="card-tags">${project.tags.split(',').map(tag =>
                `<span class="skill-tag">${tag.trim()}</span>`).join('')}</div>` : ''}
            ${statusHTML}
        `;
        return card;
    }

    createSkillCategory(category, skillData) {
        const div = document.createElement('div');
        div.className = 'skill-category';
        const rawSkills = typeof skillData === 'string' ? skillData : (skillData.description || '');
        const skillList = rawSkills.split(',').map(s => s.trim()).filter(s => s);
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
            <h3 class="card-title">${interest.title || ''}</h3>
            ${interest.description ? `<p class="card-description">${interest.description}</p>` : ''}
        `;
        return card;
    }

    createResourceCard(resources) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3 class="card-title">Helpful Resources</h3>
            <div class="project-actions" style="margin-top: var(--spacing-md);">
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