const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const twilio = require("twilio");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

admin.initializeApp();

const twilioAccountSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioAuthToken = defineSecret("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = defineSecret("TWILIO_PHONE_NUMBER");

function toE164(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits;
}

// ─── Twilio Mass SMS (v2) ───
exports.sendMassText = onCall({ auth: null, invoker: "public", secrets: [twilioAccountSid, twilioAuthToken, twilioPhoneNumber] }, async (request) => {
  const { message, recipients } = request.data;

  if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw new HttpsError("invalid-argument", "Message and recipients are required.");
  }

  const client = twilio(twilioAccountSid.value(), twilioAuthToken.value());
  const from = twilioPhoneNumber.value();
  const db = admin.firestore();

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

      // Store phone-to-contact mapping so incoming replies can be matched
      if (recipient.contactId) {
        await db.collection("phoneDirectory").doc(toE164(recipient.phone)).set({
          contactId: recipient.contactId,
          contactName: recipient.name || '',
          phone: toE164(recipient.phone),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      errors.push({ phone: recipient.phone, error: err.message });
    }
  }

  await db.collection("smsLogs").add({
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

// ─── Twilio Incoming SMS Webhook ───
exports.incomingSMS = onRequest({ auth: null, invoker: "public" }, async (req, res) => {
  try {
    const from = req.body.From;
    const body = req.body.Body;

    if (!from || !body) {
      res.status(400).send("Missing From or Body");
      return;
    }

    const db = admin.firestore();
    const normalizedFrom = toE164(from);

    // Look up the contact from the phone directory
    const dirDoc = await db.collection("phoneDirectory").doc(normalizedFrom).get();
    let contactId = null;
    let contactName = normalizedFrom;

    if (dirDoc.exists) {
      const dirData = dirDoc.data();
      contactId = dirData.contactId;
      contactName = dirData.contactName || normalizedFrom;
    }

    // Build the channel name - use direct-{contactId} if we know the contact, otherwise 'sms-incoming'
    const channel = contactId ? `direct-${contactId}` : 'sms-incoming';

    // Write the incoming message to Firestore messages collection
    await db.collection("messages").add({
      senderId: contactId || normalizedFrom,
      senderName: contactName,
      senderAvatar: contactName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || 'SMS',
      text: body,
      channel,
      direct: true,
      recipientId: 'ftss',
      recipientName: 'FTSS',
      source: 'twilio',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Respond with empty TwiML (no auto-reply)
    res.set("Content-Type", "text/xml");
    res.send('<Response></Response>');
  } catch (err) {
    console.error("incomingSMS error:", err);
    res.status(500).send("Error processing message");
  }
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
  // First user becomes manager, rest are workers
  const existingUsers = await db.collection("users").get();
  const isFirstUser = existingUsers.empty;
  const userRef = db.collection("users").doc();
  await userRef.set({
    phone: normalized,
    password: hashed,
    name: name || '',
    role: isFirstUser ? 'manager' : 'worker',
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

  return { success: true, token, userId: userDoc.id, name: userData.name, phone: normalized, role: userData.role || 'worker' };
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

  // Get user role
  const userDoc = await db.collection("users").doc(data.userId).get();
  const role = userDoc.exists ? (userDoc.data().role || 'worker') : 'worker';

  return { valid: true, userId: data.userId, name: data.name, phone: data.phone, role };
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

  // Get user role
  const userDoc = await db.collection("users").doc(data.userId).get();
  const role = userDoc.exists ? (userDoc.data().role || 'worker') : 'worker';

  return { trusted: true, token, userId: data.userId, name: data.name, phone: data.phone, role };
});

// ─── User Roles ───
exports.listUsers = onCall({ auth: null }, async (request) => {
  const db = admin.firestore();
  const snap = await db.collection("users").get();
  const users = snap.docs.map(d => ({
    id: d.id,
    name: d.data().name || '',
    phone: d.data().phone || '',
    role: d.data().role || 'worker',
  }));
  return { users };
});

exports.setUserRole = onCall({ auth: null }, async (request) => {
  const { targetUserId, role, token } = request.data;
  if (!targetUserId || !role || !['manager', 'supervisor', 'worker'].includes(role)) {
    throw new HttpsError("invalid-argument", "Valid targetUserId and role are required.");
  }
  const db = admin.firestore();

  await db.collection("users").doc(targetUserId).update({ role });
  return { success: true };
});

// ─── Role Upgrade Requests ───
exports.requestRoleUpgrade = onCall({ auth: null }, async (request) => {
  const { userId, currentRole, requestedRole } = request.data;
  if (!userId || !currentRole || !requestedRole) {
    throw new HttpsError("invalid-argument", "userId, currentRole, and requestedRole are required.");
  }
  const validUpgrade = (currentRole === 'worker' && requestedRole === 'supervisor') || (currentRole === 'supervisor' && requestedRole === 'manager');
  if (!validUpgrade) {
    throw new HttpsError("invalid-argument", "Workers can apply for supervisor, supervisors can apply for manager.");
  }
  const db = admin.firestore();

  // Check for existing pending request
  const existing = await db.collection("roleRequests").where("userId", "==", userId).where("status", "==", "pending").get();
  if (!existing.empty) {
    throw new HttpsError("already-exists", "You already have a pending request.");
  }

  await db.collection("roleRequests").add({
    userId,
    currentRole,
    requestedRole,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true };
});

exports.listRoleRequests = onCall({ auth: null }, async (request) => {
  const db = admin.firestore();
  const snap = await db.collection("roleRequests").where("status", "==", "pending").get();
  const requests = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    // Fetch user name
    const userDoc = await db.collection("users").doc(data.userId).get();
    const userName = userDoc.exists ? (userDoc.data().name || '') : '';
    requests.push({ id: doc.id, ...data, userName });
  }
  return { requests };
});

exports.handleRoleRequest = onCall({ auth: null }, async (request) => {
  const { requestId, action } = request.data;
  if (!requestId || !['approve', 'deny'].includes(action)) {
    throw new HttpsError("invalid-argument", "requestId and action (approve/deny) are required.");
  }
  const db = admin.firestore();
  const reqDoc = await db.collection("roleRequests").doc(requestId).get();
  if (!reqDoc.exists) {
    throw new HttpsError("not-found", "Request not found.");
  }
  const reqData = reqDoc.data();
  if (reqData.status !== 'pending') {
    throw new HttpsError("failed-precondition", "Request already handled.");
  }

  if (action === 'approve') {
    await db.collection("users").doc(reqData.userId).update({ role: reqData.requestedRole });
  }
  await db.collection("roleRequests").doc(requestId).update({ status: action === 'approve' ? 'approved' : 'denied' });
  return { success: true };
});
exports.logoutUser = onCall({ auth: null }, async (request) => {
  const { token } = request.data;

  if (token) {
    const db = admin.firestore();
    await db.collection("sessions").doc(token).delete();
  }

  return { success: true };
});
