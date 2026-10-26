import './styles/global.css';
import './styles/shared-ui.css';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { UnsavedWorkProvider } from './features/unsaved-work/UnsavedWorkProvider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <UnsavedWorkProvider>
        <App />
      </UnsavedWorkProvider>
    ),
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
