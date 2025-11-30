import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import DinnerEventTracker from './components/DinnerEventTracker.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DinnerEventTracker />
  </StrictMode>
);
