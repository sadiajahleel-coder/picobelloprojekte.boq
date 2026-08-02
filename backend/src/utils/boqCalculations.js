// Extracted from BoqItem's pre('save') hook so the core pricing formula —
// the number every BOQ total in the app ultimately depends on — is
// directly testable without touching Mongoose or a database.
function calculateBoqItem({ baseCost, overheadPercent, profitPercent, quantity }) {
  const overhead = 1 + (overheadPercent || 0) / 100;
  const profit = 1 + (profitPercent || 0) / 100;
  const finalUnitPrice = parseFloat(((baseCost || 0) * overhead * profit).toFixed(2));
  const totalCost = parseFloat((finalUnitPrice * (quantity || 0)).toFixed(2));
  return { finalUnitPrice, totalCost };
}

module.exports = { calculateBoqItem };
