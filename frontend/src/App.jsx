import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ModulesProvider } from './context/ModulesContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PlanGate from './components/PlanGate';

// Auth
import Landing            from './pages/Landing';
import Login              from './pages/auth/Login';
import Register           from './pages/auth/Register';
import ForgotPassword     from './pages/auth/ForgotPassword';
import ResetPassword      from './pages/auth/ResetPassword';
import AcceptInvite       from './pages/auth/AcceptInvite';

import Layla              from './components/Layla';

// Dashboard
import Dashboard          from './pages/Dashboard';

// Projects & Contacts
import Projects           from './pages/Projects';
import Contacts           from './pages/Contacts';

// Pricing Libraries
import QsPricing          from './pages/QsPricing';
import QsComparison       from './pages/QsComparison';
import ArtisanPricing     from './pages/ArtisanPricing';
import MaterialPricing    from './pages/MaterialPricing';
import PricingIntelligence from './pages/PricingIntelligence';

// Invoices
import Invoices           from './pages/Invoices';
import InvoiceDetail      from './pages/InvoiceDetail';

// Execution
import ProgressTracker    from './pages/ProgressTracker';
import ProgrammeBuilder   from './pages/ProgrammeBuilder';
import ChangeOrders       from './pages/ChangeOrders';
import SiteReports        from './pages/SiteReports';
import Analytics          from './pages/Analytics';
import ExpenseTracker     from './pages/ExpenseTracker';

// Estimator (kept)
import Estimator          from './pages/Estimator';
import EstimateDetail     from './pages/EstimateDetail';
import EstimateHistory    from './pages/EstimateHistory';
import HistoricalProjects from './pages/HistoricalProjects';
import Simulator          from './pages/Simulator';

// Documents
import Documents          from './pages/Documents';

// BOQ Builder
import BoqBuilder         from './pages/BoqBuilder';

// Client Portal
import ClientPortal       from './pages/ClientPortal';
import ClientBOQ          from './pages/ClientBOQ';
import ClientInvoices     from './pages/ClientInvoices';
import ClientComments     from './pages/ClientComments';

// Admin
import CompanySettings    from './pages/CompanySettings';
import TeamManagement     from './pages/TeamManagement';
import Profile            from './pages/Profile';
import OwnerDashboard     from './pages/OwnerDashboard';
import Waitlist           from './pages/Waitlist';
import PayInvoice         from './pages/PayInvoice';
import MasterImport       from './pages/MasterImport';

function AppHome() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'client' ? '/app/client-portal' : '/app/dashboard'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModulesProvider>
        <ToastProvider>
        <Layla />
        <Routes>
          <Route path="/"                        element={<Landing />} />
          <Route path="/login"                   element={<Login />} />
          <Route path="/register"                element={<Register />} />
          <Route path="/forgot-password"         element={<ForgotPassword />} />
          <Route path="/reset-password/:token"   element={<ResetPassword />} />
          <Route path="/accept-invite/:token"    element={<AcceptInvite />} />
          <Route path="/invoice/pay/:token"      element={<PayInvoice />} />

          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index                          element={<AppHome />} />

            {/* Dashboard */}
            <Route path="dashboard"              element={<Dashboard />} />

            {/* Projects & Contacts */}
            <Route path="projects"               element={<Projects />} />
            <Route path="contacts"               element={<Contacts />} />

            {/* Pricing Libraries — basic+ */}
            <Route path="qs-prices"              element={<PlanGate required="basic"><QsPricing /></PlanGate>} />
            <Route path="qs-comparison"          element={<PlanGate required="basic"><QsComparison /></PlanGate>} />
            <Route path="artisan-prices"         element={<PlanGate required="basic"><ArtisanPricing /></PlanGate>} />
            <Route path="materials"              element={<PlanGate required="basic"><MaterialPricing /></PlanGate>} />
            <Route path="price-intelligence"     element={<PlanGate required="premium"><PricingIntelligence /></PlanGate>} />

            {/* Invoices */}
            <Route path="invoices"               element={<Invoices />} />
            <Route path="invoices/:id"           element={<InvoiceDetail />} />

            {/* Execution — premium */}
            <Route path="progress"               element={<PlanGate required="premium"><ProgressTracker /></PlanGate>} />
            <Route path="programme"              element={<PlanGate required="basic"><ProgrammeBuilder /></PlanGate>} />
            <Route path="change-orders"          element={<PlanGate required="premium"><ChangeOrders /></PlanGate>} />
            <Route path="site-reports"           element={<PlanGate required="premium"><SiteReports /></PlanGate>} />
            <Route path="analytics"              element={<PlanGate required="premium"><Analytics /></PlanGate>} />
            <Route path="expenses"               element={<PlanGate required="premium"><ExpenseTracker /></PlanGate>} />

            {/* Estimator — free; history & simulator premium */}
            <Route path="estimator"              element={<Estimator />} />
            <Route path="estimates"              element={<PlanGate required="basic"><EstimateHistory /></PlanGate>} />
            <Route path="estimates/:id"          element={<EstimateDetail />} />
            <Route path="historical-projects"    element={<PlanGate required="basic"><HistoricalProjects /></PlanGate>} />
            <Route path="simulator"              element={<PlanGate required="premium"><Simulator /></PlanGate>} />

            {/* Documents */}
            <Route path="documents"              element={<Documents />} />

            {/* BOQ Builder */}
            <Route path="boq"                    element={<BoqBuilder />} />

            {/* Client Portal */}
            <Route path="client-portal"          element={<ClientPortal />} />
            <Route path="client-boq"             element={<ClientBOQ />} />
            <Route path="client-invoices"        element={<ClientInvoices />} />
            <Route path="client-comments"        element={<ClientComments />} />

            {/* Admin */}
            <Route path="settings"               element={<CompanySettings />} />
            <Route path="team"                   element={<TeamManagement />} />
            <Route path="profile"                element={<Profile />} />
            <Route path="owner"                  element={<OwnerDashboard />} />
            <Route path="waitlist"               element={<Waitlist />} />
            <Route path="master-import"          element={<MasterImport />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
        </ModulesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
