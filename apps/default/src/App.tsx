import { lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { GenesisSection } from '@/lib/genesis';
import { GenesisAuth } from '@/lib/genesis-auth';

/**
 * Pages are `React.lazy`-imported so one failed chunk cannot block the shell.
 * Add a sibling entry here for every new file in `src/pages/`.
 */
const HomePage = lazy(() => import('@/pages/HomePage'));
const CrmPage = lazy(() => import('@/pages/CrmPage'));
const CommandCenterPage = lazy(() => import('@/pages/CommandCenterPage'));
const EventCalendarPage = lazy(() => import('@/pages/EventCalendarPage'));
const OffersPage = lazy(() => import('@/pages/OffersPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ActivationPage = lazy(() => import('@/pages/ActivationPage'));

/**
 * The app shell: router, shared layout, and routes ONLY.
 *
 * Keep this file thin. Every page belongs in its own `src/pages/*.tsx` file,
 * registered here as one more `<Route>` - never grown inline in this component.
 * Wrap each route element in `<GenesisSection>` so a render-phase throw in one
 * page degrades to a localized card instead of white-screening the whole app.
 *
 * Do NOT mount a `ThemeProvider` here; `main.tsx` already provides one.
 */
export default function App() {
  useEffect(() => {
    document.title = 'SCENOTEHNICA.RO - Evenimentul tău. Regizat tehnic.';
  }, []);

  return (
    <GenesisAuth>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <GenesisSection name="Home">
                <HomePage />
              </GenesisSection>
            }
          />
          <Route
            path="/crm"
            element={
              <GenesisSection name="CRM">
                <CrmPage />
              </GenesisSection>
            }
          />
          <Route
            path="/command-center"
            element={
              <GenesisSection name="Command Center">
                <CommandCenterPage />
              </GenesisSection>
            }
          />
          <Route
            path="/event-calendar"
            element={
              <GenesisSection name="Event Calendar">
                <EventCalendarPage />
              </GenesisSection>
            }
          />
          <Route
            path="/oferta"
            element={
              <GenesisSection name="Oferta">
                <OffersPage />
              </GenesisSection>
            }
          />
          <Route
            path="/settings"
            element={
              <GenesisSection name="Settings">
                <SettingsPage />
              </GenesisSection>
            }
          />
          <Route
            path="/activate/:token"
            element={
              <GenesisSection name="Activare acces">
                <ActivationPage />
              </GenesisSection>
            }
          />
        </Routes>
      </BrowserRouter>
    </GenesisAuth>
  );
}
