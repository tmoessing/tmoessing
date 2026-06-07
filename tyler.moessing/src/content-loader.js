import ContentLoader from './src/content-loader.js?v=3.3';

window.addEventListener('DOMContentLoaded', () => {
    window.contentLoader = new ContentLoader();
    window.contentLoader.load();
});
