const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const twilio = require("twilio");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

admin.initializeApp();

function toE164(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits;
}

// ─── Twilio Mass SMS ───
exports.sendMassText = onCall({ auth: null }, async (request) => {
  const { message, recipients } = request.data;

  if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw new HttpsError("invalid-argument", "Message and recipients are required.");
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const from = process.env.TWILIO_PHONE_NUMBER;

  const results = [];
  const errors = [];

  for (const recipient of recipients) {
    try {
      const result = await client.messages.create({
        body: message,
        from,
        to: toE164(recipient.phone),
      });
      results.push({ phone: recipient.phone, sid: result.sid, status: result.status });
    } catch (err) {
      errors.push({ phone: recipient.phone, error: err.message });
    }
  }

  await admin.firestore().collection("smsLogs").add({
    message,
    recipientCount: recipients.length,
    successCount: results.length,
    errorCount: errors.length,
    results,
    errors,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: results.length, failed: errors.length, errors };
});

// ─── Auth: Register ───
exports.registerUser = onCall({ auth: null }, async (request) => {
  const { phone, password, name } = request.data;

  if (!phone || !password) {
    throw new HttpsError("invalid-argument", "Phone and password are required.");
  }

  const db = admin.firestore();
  const normalized = toE164(phone);

  // Check if user already exists
  const existing = await db.collection("users").where("phone", "==", normalized).get();
  if (!existing.empty) {
    throw new HttpsError("already-exists", "An account with this phone number already exists.");
  }

  const hashed = await bcrypt.hash(password, 10);
  const userRef = db.collection("users").doc();
  await userRef.set({
    phone: normalized,
    password: hashed,
    name: name || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, userId: userRef.id };
});

// ─── Auth: Login ───
exports.loginUser = onCall({ auth: null }, async (request) => {
  const { phone, password } = request.data;

  if (!phone || !password) {
    throw new HttpsError("invalid-argument", "Phone and password are required.");
  }

  const db = admin.firestore();
  const normalized = toE164(phone);

  const snap = await db.collection("users").where("phone", "==", normalized).get();
  if (snap.empty) {
    throw new HttpsError("not-found", "No account found with this phone number.");
  }

  const userDoc = snap.docs[0];
  const userData = userDoc.data();

  const valid = await bcrypt.compare(password, userData.password);
  if (!valid) {
    throw new HttpsError("permission-denied", "Incorrect password.");
  }

  // Create session token
  const token = uuidv4();
  await db.collection("sessions").doc(token).set({
    userId: userDoc.id,
    phone: normalized,
    name: userData.name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
  });

  return { success: true, token, userId: userDoc.id, name: userData.name, phone: normalized };
});

// ─── Auth: Validate Session ───
exports.validateSession = onCall({ auth: null }, async (request) => {
  const { token } = request.data;

  if (!token) {
    throw new HttpsError("invalid-argument", "Token is required.");
  }

  const db = admin.firestore();
  const doc = await db.collection("sessions").doc(token).get();

  if (!doc.exists) {
    return { valid: false };
  }

  const data = doc.data();
  if (data.expiresAt.toDate() < new Date()) {
    await db.collection("sessions").doc(token).delete();
    return { valid: false };
  }

  return { valid: true, userId: data.userId, name: data.name, phone: data.phone };
});

// ─── Auth: Trust IP ───
exports.trustIP = onCall({ auth: null }, async (request) => {
  const { token, ip } = request.data;

  if (!token || !ip) {
    throw new HttpsError("invalid-argument", "Token and IP are required.");
  }

  const db = admin.firestore();
  const session = await db.collection("sessions").doc(token).get();
  if (!session.exists) {
    throw new HttpsError("permission-denied", "Invalid session.");
  }

  const { userId, phone, name } = session.data();

  await db.collection("trustedIPs").doc(ip).set({
    userId,
    phone,
    name,
    trustedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// ─── Auth: Check IP ───
exports.checkIP = onCall({ auth: null }, async (request) => {
  const { ip } = request.data;

  if (!ip) {
    return { trusted: false };
  }

  const db = admin.firestore();
  const doc = await db.collection("trustedIPs").doc(ip).get();

  if (!doc.exists) {
    return { trusted: false };
  }

  const data = doc.data();

  // Create a session for the trusted IP user
  const token = uuidv4();
  await db.collection("sessions").doc(token).set({
    userId: data.userId,
    phone: data.phone,
    name: data.name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  });

  return { trusted: true, token, userId: data.userId, name: data.name, phone: data.phone };
});

// ─── Auth: Logout ───
exports.logoutUser = onCall({ auth: null }, async (request) => {
  const { token } = request.data;

  if (token) {
    const db = admin.firestore();
    await db.collection("sessions").doc(token).delete();
  }

  return { success: true };
});
