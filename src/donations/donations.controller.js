const express = require('express');
const router = express.Router();
const donationsService = require('./donations.service');
const { authenticate, authorize } = require('../auth/auth.middleware');

router.post('/', authenticate, authorize('admin', 'donor'), (req, res) => {
  try {
    const donation = donationsService.create({ ...req.body, donorId: req.user.id });
    res.status(201).json(donation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', authenticate, (req, res) => {
  const donations = donationsService.getAll(req.query);
  res.status(200).json(donations);
});

router.get('/:id', authenticate, (req, res) => {
  const donation = donationsService.getById(Number(req.params.id));
  if (!donation) return res.status(404).json({ error: 'Donation not found' });
  res.status(200).json(donation);
});

router.post('/:id/claim', authenticate, authorize('admin', 'beneficiary'), (req, res) => {
  try {
    const donation = donationsService.claim(Number(req.params.id), req.user.id);
    res.status(200).json(donation);
  } catch (err) {
    const status = err.message === 'Donation not found' ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.post('/:id/deliver', authenticate, authorize('admin', 'donor'), (req, res) => {
  try {
    const donation = donationsService.markDelivered(Number(req.params.id), req.user.id, req.user.role);
    res.status(200).json(donation);
  } catch (err) {
    const status = err.message === 'Donation not found' ? 404 : err.message === 'Unauthorized' ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
