const donationsService = require('../donations/donations.service');

function generateImpactReport(filters = {}) {
  const all = donationsService.getAll(filters);
  const total = all.length;
  const available = all.filter(d => d.status === 'available').length;
  const claimed = all.filter(d => d.status === 'claimed').length;
  const delivered = all.filter(d => d.status === 'delivered').length;
  const expired = all.filter(d => d.status === 'expired').length;
  const uniqueDonors = new Set(all.map(d => d.donorId)).size;
  const uniqueBeneficiaries = new Set(all.filter(d => d.claimedBy).map(d => d.claimedBy)).size;
  const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '0.0';

  return {
    generatedAt: new Date().toISOString(),
    summary: { total, available, claimed, delivered, expired, uniqueDonors, uniqueBeneficiaries, deliveryRate: `${deliveryRate}%` }
  };
}

function generateDonorReport(donorId) {
  if (!donorId) throw new Error('donorId is required');
  const donations = donationsService.getAll({ donorId });
  return {
    donorId,
    totalDonations: donations.length,
    delivered: donations.filter(d => d.status === 'delivered').length,
    pending: donations.filter(d => ['available', 'claimed'].includes(d.status)).length,
    donations
  };
}

module.exports = { generateImpactReport, generateDonorReport };
