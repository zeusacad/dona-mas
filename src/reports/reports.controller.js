const express = require('express');
const router = express.Router();
const reportsService = require('./reports.service');
const { authenticate, authorize } = require('../auth/auth.middleware');

router.get('/impact', authenticate, authorize('admin'), (req, res) => {
  const report = reportsService.generateImpactReport(req.query);
  res.status(200).json(report);
});

router.get('/donor/:donorId', authenticate, (req, res) => {
  try {
    const donorId = Number(req.params.donorId);
    if (req.user.role !== 'admin' && req.user.id !== donorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const report = reportsService.generateDonorReport(donorId);
    res.status(200).json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
