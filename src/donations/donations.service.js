const donations = [];
let nextId = 1;

const STATUS = {
  AVAILABLE: 'available',
  CLAIMED: 'claimed',
  DELIVERED: 'delivered',
  EXPIRED: 'expired'
};

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>'"&]/g, c => ({ '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '&': '&amp;' }[c]));
}

function create({ title, description, quantity, unit, expiresAt, location, donorId }) {
  if (!title || !quantity || !donorId) {
    throw new Error('Title, quantity and donorId are required');
  }
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  const donation = {
    id: nextId++,
    title: sanitize(title),
    description: sanitize(description || ''),
    quantity,
    unit: sanitize(unit || 'units'),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    location: sanitize(location || ''),
    donorId,
    status: STATUS.AVAILABLE,
    claimedBy: null,
    createdAt: new Date()
  };
  donations.push(donation);
  return donation;
}

function getAll(filters = {}) {
  let result = [...donations];
  if (filters.status) result = result.filter(d => d.status === filters.status);
  if (filters.donorId) result = result.filter(d => d.donorId === filters.donorId);
  return result;
}

function getById(id) {
  return donations.find(d => d.id === id) || null;
}

function claim(id, beneficiaryId) {
  const donation = getById(id);
  if (!donation) throw new Error('Donation not found');
  if (donation.status !== STATUS.AVAILABLE) throw new Error('Donation is not available');
  donation.status = STATUS.CLAIMED;
  donation.claimedBy = beneficiaryId;
  return donation;
}

function markDelivered(id, userId, userRole) {
  const donation = getById(id);
  if (!donation) throw new Error('Donation not found');
  if (donation.status !== STATUS.CLAIMED) throw new Error('Donation is not claimed yet');
  if (userRole !== 'admin' && donation.donorId !== userId) throw new Error('Unauthorized');
  donation.status = STATUS.DELIVERED;
  return donation;
}

function clearDonations() {
  donations.length = 0;
  nextId = 1;
}

module.exports = { create, getAll, getById, claim, markDelivered, clearDonations, STATUS };
