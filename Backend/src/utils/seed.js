// ─────────────────────────────────────────────────────
// GrievAI — DB Seeder
// Creates default admin + officer accounts on first run
// ─────────────────────────────────────────────────────
const User = require('../models/User');

async function seedAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@grievai.gov.in';
    const existing   = await User.findOne({ email: adminEmail });
    if (existing) return;   // already seeded

    await User.create({
      name:     'GrievAI Administrator',
      email:    adminEmail,
      password: process.env.ADMIN_PASSWORD || 'Admin@GrievAI2025',
      role:     'admin',
      isActive: true,
    });
    console.log('🌱 Admin account seeded:', adminEmail);

    // Seed a demo officer
    const officerEmail = 'officer@grievai.gov.in';
    const existingOfficer = await User.findOne({ email: officerEmail });
    if (!existingOfficer) {
      await User.create({
        name:       'Officer Demo',
        email:      officerEmail,
        password:   'Officer@123',
        role:       'officer',
        employeeId: 'IAS-2025-MP-001',
        department: 'Water Supply & Sanitation',
        isActive:   true,
      });
      console.log('🌱 Demo officer seeded:', officerEmail);
    }

    // Seed a demo citizen
    const citizenEmail = 'citizen@grievai.gov.in';
    const existingCitizen = await User.findOne({ email: citizenEmail });
    if (!existingCitizen) {
      await User.create({
        name:     'Ramesh Kumar (Demo)',
        email:    citizenEmail,
        mobile:   '9876543210',
        password: 'Citizen@123',
        role:     'citizen',
        isActive: true,
      });
      console.log('🌱 Demo citizen seeded:', citizenEmail);
    }
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  }
}

module.exports = { seedAdmin };
