'use strict';
const { z } = require('zod');

// Returns an Express middleware that validates req.body against the given Zod schema.
// On failure it responds with 400 + a list of field errors.
// On success it replaces req.body with the parsed (coerced + stripped) data.
function zodValidate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    req.body = result.data;
    next();
  };
}

// ── Shared schemas ────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:       z.string().email('Invalid email address'),
  password:    z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(200).optional(),
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const WAITLIST_ROLES = [
  'quantity_surveyor', 'project_manager', 'contractor', 'architect',
  'civil_structural_engineer', 'mep_engineer', 'site_supervisor',
  'developer_client', 'consultant', 'supplier_vendor', 'student', 'other',
];

const waitlistSchema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters').max(100),
  role:  z.enum(WAITLIST_ROLES, { message: 'Please select a role' }),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(30).optional().or(z.literal('')),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const estimateSchema = z.object({
  projectName:  z.string().min(1, 'Project name is required').max(200),
  clientName:   z.string().max(200).optional(),
  clientEmail:  z.string().email('Invalid client email').optional().or(z.literal('')),
  description:  z.string().max(2000).optional(),
  lineItems:    z.array(z.object({
    description: z.string().min(1, 'Line item description is required'),
    quantity:    z.number().positive('Quantity must be positive'),
    unit:        z.string().optional(),
    unitRate:    z.number().min(0, 'Unit rate must be non-negative'),
  })).optional(),
  notes:        z.string().max(2000).optional(),
  validUntil:   z.string().optional(),
}).passthrough(); // allow extra fields the frontend may send

const invoiceSchema = z.object({
  title:        z.string().min(1, 'Title is required').max(200),
  clientName:   z.string().max(200).optional(),
  clientEmail:  z.string().email('Invalid client email').optional().or(z.literal('')),
  lineItems:    z.array(z.object({
    description: z.string().min(1),
    quantity:    z.number().positive(),
    unit:        z.string().optional(),
    unitRate:    z.number().min(0),
    amount:      z.number().min(0).optional(),
  })).optional(),
  dueDate:      z.string().optional(),
  notes:        z.string().max(2000).optional(),
}).passthrough();

// ── BOQ versions / items ──────────────────────────────────────────────────────

const boqVersionSchema = z.object({
  name:        z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  status:      z.enum(['draft', 'final', 'approved']).optional(),
  currency:    z.string().max(10).optional(),
});
const boqVersionUpdateSchema = boqVersionSchema.partial();

const boqItemOptionSchema = z.object({
  tier:     z.enum(['basic', 'standard', 'premium']).optional(),
  label:    z.string().max(200).optional(),
  baseCost: z.coerce.number().min(0).optional(),
});
const boqItemSchema = z.object({
  item:            z.string().trim().min(1, 'Item name is required').max(300),
  description:     z.string().max(2000).optional(),
  unit:            z.string().trim().min(1, 'Unit is required').max(50),
  quantity:        z.coerce.number().min(0, 'Quantity must be non-negative'),
  baseCost:        z.coerce.number().min(0, 'Base cost must be non-negative'),
  overheadPercent: z.coerce.number().min(0).max(1000).optional(),
  profitPercent:   z.coerce.number().min(0).max(1000).optional(),
  options:         z.array(boqItemOptionSchema).max(10).optional(),
});
const boqItemUpdateSchema = boqItemSchema.partial();

// ── Change orders ──────────────────────────────────────────────────────────────

const changeOrderSchema = z.object({
  projectId:    z.string().min(1, 'projectId is required'),
  boqVersionId: z.string().optional(),
  title:        z.string().trim().min(1, 'Title is required').max(300),
  description:  z.string().max(2000).optional(),
  reason:       z.string().max(2000).optional(),
  originalCost: z.coerce.number().min(0, 'Original cost must be non-negative'),
  newCost:      z.coerce.number().min(0, 'New cost must be non-negative'),
});
const changeOrderUpdateSchema = z.object({
  title:        z.string().trim().min(1).max(300).optional(),
  description:  z.string().max(2000).optional(),
  reason:       z.string().max(2000).optional(),
  originalCost: z.coerce.number().min(0).optional(),
  newCost:      z.coerce.number().min(0).optional(),
});

// ── Programme / weekly reports ──────────────────────────────────────────────────

const programmeActivitySchema = z.object({
  name:            z.string().trim().min(1).max(200),
  startWeek:       z.coerce.number().min(0).optional(),
  durationWeeks:   z.coerce.number().min(1).optional(),
  percentComplete: z.coerce.number().min(0).max(100).optional(),
});
const programmePhaseSchema = z.object({
  name:       z.string().trim().min(1).max(200),
  color:      z.string().max(20).optional(),
  activities: z.array(programmeActivitySchema).max(200).optional(),
});
const programmeCreateSchema = z.object({
  projectId: z.string().optional(),
  name:      z.string().max(200).optional(),
  startDate: z.coerce.date({ message: 'startDate is required' }),
});
const programmeUpdateSchema = z.object({
  name:      z.string().max(200).optional(),
  startDate: z.coerce.date().optional(),
  phases:    z.array(programmePhaseSchema).max(50).optional(),
});
const weeklyReportSchema = z.object({
  weekNumber:     z.coerce.number().int().min(0, 'weekNumber is required'),
  weekEnding:     z.coerce.date().optional(),
  overallPlanned: z.coerce.number().min(0).max(100).optional(),
  overallActual:  z.coerce.number().min(0).max(100).optional(),
  phaseProgress:  z.array(z.object({
    phase:   z.string().max(200).optional(),
    planned: z.coerce.number().optional(),
    actual:  z.coerce.number().optional(),
  })).max(50).optional(),
  lookAhead:   z.string().max(2000).optional(),
  issues:      z.string().max(2000).optional(),
  signedOffBy: z.string().max(200).optional(),
});

// ── Expenses ─────────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Labour', 'Materials', 'Equipment', 'Transport', 'Professional Fees',
  'Permits & Licenses', 'Utilities', 'Office & Admin', 'Safety & PPE', 'Other',
];
const expenseSchema = z.object({
  projectId:   z.string().optional(),
  category:    z.enum(EXPENSE_CATEGORIES).optional(),
  description: z.string().trim().min(1, 'Description is required').max(500),
  amount:      z.coerce.number().min(0, 'Amount must be non-negative'),
  currency:    z.string().max(10).optional(),
  date:        z.coerce.date().optional(),
  vendor:      z.string().max(200).optional(),
  notes:       z.string().max(2000).optional(),
});
const expenseUpdateSchema = expenseSchema.partial();

// ── Estimate calculation ──────────────────────────────────────────────────────

const estimateCalculateSchema = z.object({
  sizeM2:    z.coerce.number().positive('Size (m²) must be a positive number'),
  condition: z.enum(['carcass', 'advanced_carcass', 'semi_finished', 'finished']),
  tier:      z.enum(['basic', 'mid_range', 'premium']),
});

module.exports = {
  zodValidate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
    estimate: estimateSchema,
    invoice: invoiceSchema,
    waitlist: waitlistSchema,
    boqVersion: boqVersionSchema,
    boqVersionUpdate: boqVersionUpdateSchema,
    boqItem: boqItemSchema,
    boqItemUpdate: boqItemUpdateSchema,
    changeOrder: changeOrderSchema,
    changeOrderUpdate: changeOrderUpdateSchema,
    programmeCreate: programmeCreateSchema,
    programmeUpdate: programmeUpdateSchema,
    weeklyReport: weeklyReportSchema,
    expense: expenseSchema,
    expenseUpdate: expenseUpdateSchema,
    estimateCalculate: estimateCalculateSchema,
  },
};
