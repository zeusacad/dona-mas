const express = require('express');
const router = express.Router();
const authService = require('./auth.service');
const { authenticate } = require('./auth.middleware');

router.post('/register', async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    const status = err.message === 'Email already registered' ? 409 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

module.exports = router;
