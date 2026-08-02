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
  },
};
