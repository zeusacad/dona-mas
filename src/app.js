const express = require('express');
const app = express();

app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

app.use('/api/auth', require('./auth/auth.controller'));
app.use('/api/donations', require('./donations/donations.controller'));
app.use('/api/reports', require('./reports/reports.controller'));

app.get('/health', (req, res) => res.json({ status: 'ok', project: 'DonaMas' }));

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`DonaMas running on port ${PORT}`));
}
