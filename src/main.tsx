import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import DinnerEventTracker from './components/DinnerEventTracker.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DinnerEventTracker />
  </StrictMode>
);
