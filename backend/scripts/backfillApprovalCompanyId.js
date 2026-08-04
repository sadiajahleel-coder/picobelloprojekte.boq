// One-off backfill: Approval documents created before the companyId field was
// added (see fix for the /api/approvals cross-tenant leak) have no companyId
// of their own. Every controller that reads Approval now filters by
// companyId, so without this backfill those pre-existing records would
// silently stop showing up for anyone. Derives companyId from each
// approval's BoqVersion. Safe to re-run — only touches docs missing the field.
//
// Usage: MONGODB_URI=... node scripts/backfillApprovalCompanyId.js
require('dotenv').config();
const mongoose = require('mongoose');
const Approval = require('../src/models/Approval');
const BoqVersion = require('../src/models/BoqVersion');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI env variable is not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const orphaned = await Approval.find({ companyId: { $exists: false } }).select('_id boqVersionId');
  console.log(`Found ${orphaned.length} approval(s) missing companyId`);

  let fixed = 0;
  let skipped = 0;
  for (const approval of orphaned) {
    const version = await BoqVersion.findById(approval.boqVersionId).select('companyId');
    if (!version?.companyId) {
      console.warn(`  skip ${approval._id}: BOQ version ${approval.boqVersionId} missing or has no companyId`);
      skipped += 1;
      continue;
    }
    await Approval.updateOne({ _id: approval._id }, { companyId: version.companyId });
    fixed += 1;
  }

  console.log(`Backfilled ${fixed} approval(s); skipped ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
