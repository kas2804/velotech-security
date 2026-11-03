/**
 * Mock User Data Store (In-Memory for PoC)
 * In accordance with PRD Section 2: Out of scope - complex database integrations.
 */

const { authenticator } = require('otplib');

// Pre-defined base32 TOTP secret for the demo user
// This ensures persistent QR code scanning across server restarts
const DEMO_TOTP_SECRET = process.env.DEMO_TOTP_SECRET || 'JBSWY3DPEHPK3PXP'; // Base32 encoded secret: "Hello!\xDE\xAD\xBE\xEF"

const USERS = {
  admin: {
    username: 'admin',
    email: 'alex.mercer@velotech.io',
    fullName: 'Alex Mercer',
    role: 'Lead Systems Architect',
    password: process.env.DEMO_PASSWORD || 'Password123!',
    totpSecret: DEMO_TOTP_SECRET,
    department: 'Core Infrastructure & Cyber Defense',
    securityClearance: 'Level 4 (Top Secret)',
    projects: [
      { id: 'PRJ-881', name: 'Project Apex - Hyperion Cloud Migration', status: 'In Progress', progress: 78, risk: 'Low' },
      { id: 'PRJ-882', name: 'Zero-Trust Gateway Architecture (AAL2)', status: 'Active Review', progress: 92, risk: 'Medium' },
      { id: 'PRJ-883', name: 'Quantum-Resistant Key Exchange Pipeline', status: 'Planning', progress: 34, risk: 'High' },
      { id: 'PRJ-884', name: 'Automated Threat Intelligence Telemetry', status: 'Deployed', progress: 100, risk: 'Low' }
    ]
  }
};

module.exports = {
  USERS,
  DEMO_TOTP_SECRET
};
