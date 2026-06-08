import { ContentLoader } from './ContentLoader.js';
import { initApp } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI state and events
    initApp();

    // Initialize Content Loading
    window.contentLoader = new ContentLoader();
    window.contentLoader.load();
});
