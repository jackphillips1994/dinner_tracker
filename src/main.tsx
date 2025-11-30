import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import DinnerEventTracker from './components/DinnerEventTracker.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DinnerEventTracker />
  </StrictMode>
);
