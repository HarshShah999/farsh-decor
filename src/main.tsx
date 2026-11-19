import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource-variable/manrope';
import './styles/index.css';
import { loadCatalog } from './lib/catalogLoader';

// Load the live catalogue (managed in the admin panel) before the first render,
// so every page and visualizer sees the same, current data. App is imported
// afterwards so no module reads the catalogue before it is ready.
async function start() {
  // the admin panel loads its own (unpublished-inclusive) data
  if (!window.location.pathname.startsWith('/admin')) await loadCatalog();
  const { default: App } = await import('./App');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

start();
