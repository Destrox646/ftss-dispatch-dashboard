const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

exports.sendMassText = onCall(async (request) => {
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
        to: recipient.phone,
      });
      results.push({ phone: recipient.phone, sid: result.sid, status: result.status });
    } catch (err) {
      errors.push({ phone: recipient.phone, error: err.message });
    }
  }

  // Log to Firestore
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
