require('dotenv').config();
require('express-async-errors');
const Sentry = require('./config/sentry'); // manual error capture only — see errorHandler.js

const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const mongoSanitize  = require('express-mongo-sanitize');
const hpp            = require('hpp');
const connectDB      = require('./config/database');
const { checkOrigin } = require('./config/corsOptions');
const errorHandler   = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes               = require('./routes/auth');
const companyRoutes            = require('./routes/company');
const siteReportRoutes         = require('./routes/siteReports');
const historicalProjectRoutes  = require('./routes/historicalProjects');
const estimateRoutes           = require('./routes/estimates');
const invoiceRoutes            = require('./routes/invoices');

const projectRoutes       = require('./routes/projects');
const contactRoutes       = require('./routes/contacts');
const qsPriceRoutes       = require('./routes/qsPrices');
const artisanPriceRoutes  = require('./routes/artisanPrices');
const materialPriceRoutes = require('./routes/materialPrices');
const boqRoutes           = require('./routes/boq');
const changeOrderRoutes   = require('./routes/changeOrders');
const progressRoutes      = require('./routes/progress');
const analyticsRoutes     = require('./routes/analytics');
const approvalRoutes      = require('./routes/approvals');
const pricingRoutes       = require('./routes/pricing');
const dashboardRoutes     = require('./routes/dashboard');
const commentRoutes       = require('./routes/comments');
const notificationRoutes  = require('./routes/notifications');
const expenseRoutes        = require('./routes/expenses');
const documentRoutes       = require('./routes/documents');
const programmeRoutes      = require('./routes/programme');
const waitlistRoutes       = require('./routes/waitlist');

const app = express();
app.set('trust proxy', 1); // Render sits behind a reverse proxy
connectDB();

// Crashes that never reach Express's error middleware (e.g. an async error
// outside a request) would otherwise be invisible to Sentry entirely.
process.on('unhandledRejection', (err) => Sentry.captureException(err));
process.on('uncaughtException', (err) => Sentry.captureException(err));

// ── CORS ───────────────────────────────────────────────────────────────────────────
app.use(cors({ origin: checkOrigin, credentials: true }));

// ── Security headers ─────────────────────────────────────────────────────────────────
app.use(helmet());

// ── Body parsing ───────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── NoSQL injection + HTTP parameter pollution prevention ─────────────────────────
app.use(mongoSanitize());
app.use(hpp());

// ── Global rate limiting ──────────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Health / root ──────────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'SquareMetre API', version: '2.0.0' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ──────────────────────────────────────────────────────────────────────
['/api/v1', '/api'].forEach((prefix) => {
  app.use(`${prefix}/auth`,                authRoutes);
  app.use(`${prefix}/company`,             companyRoutes);

  app.use(`${prefix}/estimates`,           estimateRoutes);
  app.use(`${prefix}/invoices`,            invoiceRoutes);
  app.use(`${prefix}/site-reports`,        siteReportRoutes);
  app.use(`${prefix}/historical-projects`, historicalProjectRoutes);

  app.use(`${prefix}/projects`,            projectRoutes);
  app.use(`${prefix}/contacts`,            contactRoutes);

  app.use(`${prefix}/qs-prices`,           qsPriceRoutes);
  app.use(`${prefix}/artisan-prices`,      artisanPriceRoutes);
  app.use(`${prefix}/material-prices`,     materialPriceRoutes);
  app.use(`${prefix}/pricing`,             pricingRoutes);

  app.use(`${prefix}/boq`,                 boqRoutes);
  app.use(`${prefix}/change-orders`,       changeOrderRoutes);
  app.use(`${prefix}/progress`,            progressRoutes);

  app.use(`${prefix}/analytics`,           analyticsRoutes);
  app.use(`${prefix}/approvals`,           approvalRoutes);

  app.use(`${prefix}/dashboard`,           dashboardRoutes);

  app.use(`${prefix}/comments`,            commentRoutes);
  app.use(`${prefix}/notifications`,       notificationRoutes);
  app.use(`${prefix}/expenses`,            expenseRoutes);
  app.use(`${prefix}/documents`,           documentRoutes);
  app.use(`${prefix}/programmes`,          programmeRoutes);
  app.use(`${prefix}/waitlist`,            waitlistRoutes);
});

// ── 404 + error handler ───────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SquareMetre API running on port ${PORT}`));
