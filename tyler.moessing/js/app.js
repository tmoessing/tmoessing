/**
 * App UI Module - Handles UI state, view switching, themes, and interactions.
 */

export function initApp() {
    let currentActiveView = 'resume';
    let previousView = 'resume';

    // Export functions to window for HTML onclick attributes
    window.switchView = (view, updateHash = true) => {
        const resumeBtn = document.getElementById('btn-resume');
        const libraryBtn = document.getElementById('btn-library');
        const slider = document.querySelector('.toggle-slider');
        const resumeView = document.getElementById('resume-view');
        const libraryView = document.getElementById('library-view');
        const searchView = document.getElementById('search-view');
        const aiView = document.getElementById('ai-view');
        const backBtn = document.getElementById('btn-back-to-resume');
        
        // Hide everything first
        if (resumeView) resumeView.style.display = 'none';
        if (libraryView) libraryView.style.display = 'none';
        if (searchView) searchView.style.display = 'none';
        if (aiView) aiView.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
        
        // Reset nav links active state
        document.querySelectorAll('.nav-link, .btn-outline').forEach(l => l.classList.remove('active'));

        if (view === 'resume' || view === 'professional' || view === '#/professional') {
            currentActiveView = 'resume';
            if (resumeBtn) resumeBtn.classList.add('active');
            if (libraryBtn) libraryBtn.classList.remove('active');
            if (slider) slider.style.transform = 'translateX(0)';
            
            if (resumeView) resumeView.style.display = 'block';
            
            document.querySelectorAll('.resume-nav, .professional-only-nav').forEach(el => el.style.display = 'flex');
            document.querySelectorAll('.library-nav').forEach(el => el.style.display = 'none');
            
            document.title = "Tyler Moessing - Professional";
            if (updateHash) window.location.hash = '/professional';
        } else if (view === 'search' || view.includes('search')) {
            previousView = currentActiveView;
            currentActiveView = 'search';
            if (searchView) searchView.style.display = 'block';
            if (backBtn) backBtn.style.display = 'flex';
            document.querySelector('.search-nav')?.classList.add('active');
            
            document.title = "Tyler Moessing - Search";
            if (updateHash && !window.location.hash.includes('search')) {
                window.location.hash = '/professional/search';
            }

            setTimeout(() => {
                const input = document.querySelector('#search-input');
                if (input) {
                    input.focus();
                    if (!input.value && window.contentLoader) window.contentLoader.renderSuggestedTags();
                }
            }, 100);
        } else if (view === 'ai') {
            previousView = currentActiveView;
            currentActiveView = 'ai';
            if (aiView) aiView.style.display = 'block';
            if (backBtn) backBtn.style.display = 'flex';
            document.querySelector('.ai-nav')?.classList.add('active');
            
            document.title = "Tyler Moessing - Ask AI";
            if (updateHash) window.location.hash = '/professional/ai';
        } else {
            currentActiveView = 'library';
            if (resumeBtn) resumeBtn.classList.remove('active');
            if (libraryBtn) libraryBtn.classList.add('active');
            if (slider) slider.style.transform = 'translateX(100%)';
            
            if (libraryView) libraryView.style.display = 'block';
            
            document.querySelectorAll('.resume-nav, .professional-only-nav').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.library-nav').forEach(el => el.style.display = 'flex');
            
            document.title = "Tyler Moessing - Personal";
            if (updateHash) {
                if (window.location.hash === '#/personal/personal-projects') {
                    window.location.hash = '/personal/personal-projects';
                } else {
                    window.location.hash = '/personal/sick-picks-and-plugs';
                }
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.switchPersonalView = (view, updateHash = true) => {
        const picksBtn = document.getElementById('btn-picks');
        const projectsBtn = document.getElementById('btn-personal-projects');
        const slider = document.getElementById('personal-sub-slider');
        const picksSection = document.getElementById('picks-section');
        const projectsSection = document.getElementById('projects-section-personal');

        if (view === 'picks' || view === 'sick-picks-and-plugs') {
            if (picksBtn) picksBtn.classList.add('active');
            if (projectsBtn) projectsBtn.classList.remove('active');
            if (slider) slider.style.transform = 'translateX(0)';
            if (picksSection) picksSection.style.display = 'flex';
            if (projectsSection) projectsSection.style.display = 'none';
            if (updateHash) window.location.hash = '/personal/sick-picks-and-plugs';
        } else {
            if (picksBtn) picksBtn.classList.remove('active');
            if (projectsBtn) projectsBtn.classList.add('active');
            if (slider) slider.style.transform = 'translateX(100%)';
            if (picksSection) picksSection.style.display = 'none';
            if (projectsSection) projectsSection.style.display = 'flex';
            if (updateHash) window.location.hash = '/personal/personal-projects';
        }
    };

    window.goBackFromSearch = () => {
        window.switchView(previousView);
    };

    window.toggleAbout = () => {
        const content = document.getElementById('aboutAdditional');
        const button = event.target;
        if (content.classList.contains('show')) {
            content.classList.remove('show');
            button.textContent = 'Read More';
        } else {
            content.classList.add('show');
            button.textContent = 'Read Less';
        }
    };

    window.copyLink = async (btn) => {
        const link = btn.closest('.social-link');
        const url = link.getAttribute('href');
        let textToCopy = url;
        if (url.startsWith('mailto:')) textToCopy = url.replace('mailto:', '');
        try {
            await navigator.clipboard.writeText(textToCopy);
            const originalSvg = btn.innerHTML;
            btn.innerHTML = `<svg class="icon icon-stroke" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="color: #22c55e;"><path d="m4.5 12.75 6 6 9-13.5" /></svg>`;
            setTimeout(() => { btn.innerHTML = originalSvg; }, 2000);
        } catch (err) { console.error('Failed to copy: ', err); }
    };

    window.toggleMoreSocialLinks = () => {
        const extraLinks = document.getElementById('extra-social-links');
        const showMoreBtn = document.getElementById('show-more-links');
        if (extraLinks.style.display === 'none' || extraLinks.style.display === '') {
            extraLinks.style.display = 'flex';
            showMoreBtn.textContent = 'Show Less Links ▴';
        } else {
            extraLinks.style.display = 'none';
            showMoreBtn.textContent = 'Show More Links ▾';
        }
    };

    // Hash change handling
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash;
        if (hash.startsWith('#/professional/search')) {
            if (currentActiveView !== 'search') window.switchView('search', false);
            if (window.contentLoader) window.contentLoader.handleSearchFromHash();
        } else if (hash === '#/professional/ai') {
            if (currentActiveView !== 'ai') window.switchView('ai', false);
        } else if (hash === '#/personal/sick-picks-and-plugs') {
            window.switchView('library', false);
            window.switchPersonalView('picks', false);
        } else if (hash === '#/personal/personal-projects') {
            window.switchView('library', false);
            window.switchPersonalView('projects', false);
        } else if (hash === '#/personal') {
            window.switchView('library', false);
        } else {
            window.switchView('resume', false);
        }
    });

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const moonIcon = document.querySelector('.moon-icon');
    const sunIcon = document.querySelector('.sun-icon');

    const setTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
            if (moonIcon) moonIcon.style.display = 'block';
            if (sunIcon) sunIcon.style.display = 'none';
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            if (moonIcon) moonIcon.style.display = 'none';
            if (sunIcon) sunIcon.style.display = 'block';
        }
        localStorage.setItem('theme', theme);
    };

    const savedTheme = localStorage.getItem('theme');
    setTheme(savedTheme === 'dark' ? 'dark' : 'light');

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            setTheme(body.classList.contains('dark-mode') ? 'light' : 'dark');
        });
    }

    // Mobile Menu Toggle
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('mobile-menu-toggle');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-menu-open');
            if (window.innerWidth <= 1024) {
                document.body.style.overflow = sidebar.classList.contains('mobile-menu-open') ? 'hidden' : '';
            }
        });
    }

    // Smooth scrolling & mobile menu close on link click
    document.querySelectorAll('.nav-link, .sidebar-btn, .social-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            // Close mobile menu
            if (window.innerWidth <= 1024 && sidebar) {
                sidebar.classList.remove('mobile-menu-open');
                document.body.style.overflow = '';
            }

            // Smooth scroll for hash links within current view
            if (targetId && targetId.startsWith('#') && !targetId.includes('/')) {
                e.preventDefault();
                const targetSection = document.querySelector(targetId);
                if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Initial view set based on hash
    const initialHash = window.location.hash;
    if (initialHash.startsWith('#/professional/search')) {
        window.switchView('search', false);
    } else if (initialHash === '#/professional/ai') {
        window.switchView('ai', false);
    } else if (initialHash === '#/personal/sick-picks-and-plugs') {
        window.switchView('library', false);
        window.switchPersonalView('picks', false);
    } else if (initialHash === '#/personal/personal-projects') {
        window.switchView('library', false);
        window.switchPersonalView('projects', false);
    } else if (initialHash === '#/personal') {
        window.switchView('library', false);
        window.switchPersonalView('picks', false);
    } else {
        window.switchView('resume', false);
        if (!initialHash || initialHash === '#') window.location.hash = '/professional';
    }
}
