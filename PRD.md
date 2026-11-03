# Product Requirements Document (PRD)

**Project Name:** VeloTech Secure Authentication PoC
**Document Version:** 1.0
**Target Audience:** IT/Cybersecurity Instructors

## 1. Objective
To demonstrate the risks of single-factor authentication and insecure session cookies against Adversary-in-the-Middle (AitM) phishing attacks, and to implement a remediated authentication flow using Multi-Factor Authentication (MFA) and secure session management.

## 2. Scope
This Proof of Concept (PoC) will be a lightweight web application consisting of:
* A simulated project management dashboard (protected route).
* A vulnerable login pipeline.
* A secure login pipeline implementing industry-standard security controls.
* *Out of scope:* Complex database integrations (hardcoded credentials are fine for a PoC), password reset flows, and user registration.

## 3. Functional Requirements

| Feature | Description | Acceptance Criteria |
| :--- | :--- | :--- |
| **Vulnerable Login** | Single-factor authentication endpoint. | Must accept a hardcoded username/password and return an unflagged session cookie (e.g., `Set-Cookie: session=1234`). |
| **Secure Login (Step 1)** | Primary authentication via password. | Must validate credentials and route to the MFA challenge screen *without* granting dashboard access. |
| **Secure Login (Step 2)** | Secondary authentication via TOTP. | Must prompt for a 6-digit Authenticator code. Upon success, must issue the secure session cookie. |
| **Secure Cookie Generation** | Hardened session management. | The `Set-Cookie` header must include `HttpOnly`, `Secure`, and `SameSite=Strict` flags. |
| **Session Binding** | Tying the session to the user's environment. | The backend must record the login IP and User-Agent. Subsequent requests must match these values or force an immediate logout. |

## 4. Non-Functional & Security Requirements
* **Standard Alignment:** The secure flow should align with NIST SP 800-63B guidelines for Digital Identity, specifically transitioning from Authenticator Assurance Level 1 (AAL1 - single factor) to AAL2 (multi-factor with secure session handling).
* **Environment:** The app must run on `localhost` (or a secure cloud sandbox) over HTTPS. *Note: The `Secure` cookie flag requires an HTTPS connection to function properly, even locally.*
* **Statelessness:** The PoC will use simple server-side session memory to avoid complex database setup.

## 5. User Flows

**Flow A: The Attack Simulation**
1. User (or attacker script) navigates to `/login-vulnerable`.
2. Submits correct credentials.
3. Server returns an unsecured cookie.
4. A JavaScript `document.cookie` command successfully reads and exfiltrates the cookie, proving it can be stolen.

**Flow B: The Secure Mitigation**
1. User navigates to `/login-secure`.
2. Submits correct credentials.
3. User is prompted for a TOTP code and submits it.
4. Server returns a flagged, secure cookie.
5. A JavaScript `document.cookie` command returns `undefined` (blocked by the `HttpOnly` flag).
6. Attacker attempts to use the cookie from a different IP; the server rejects the request due to Session Binding.