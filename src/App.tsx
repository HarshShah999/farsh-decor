import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import Layout from './components/layout/Layout';
import PageLoader from './components/ui/PageLoader';
import HomePage from './pages/HomePage';
import CollectionsPage from './pages/CollectionsPage';
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/ProductPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import VisualizerHubPage from './pages/VisualizerHubPage';
import NotFoundPage from './pages/NotFoundPage';

// Heavy, interactive tools are code-split and loaded on demand.
const Visualizer3DPage = lazy(() => import('./pages/Visualizer3DPage'));
const PhotoVisualizerPage = lazy(() => import('./pages/PhotoVisualizerPage'));

export default function App() {
  const location = useLocation();
  // Use the first path segment so nested query changes don't re-animate the page
  const pageKey = location.pathname;

  return (
    <MotionConfig reducedMotion="user">
      <Layout>
        <AnimatePresence mode="wait" initial={false}>
          <Suspense fallback={<PageLoader />} key={pageKey}>
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/collections/:category" element={<CategoryPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/visualizer" element={<VisualizerHubPage />} />
              <Route path="/visualizer/3d" element={<Visualizer3DPage />} />
              <Route path="/visualizer/photo" element={<PhotoVisualizerPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </Layout>
    </MotionConfig>
  );
}
