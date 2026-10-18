import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/bodoni-moda/400.css';
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/600.css';
import '@fontsource/bodoni-moda/700.css';
import 'dialkit/styles.css';
import { App } from './App';
import { TestFixture } from './TestFixture';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{import.meta.env.DEV && location.pathname === '/test' ? <TestFixture /> : <App />}</React.StrictMode>,
);
