import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, serverTimestamp, setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Settings ────────────────────────────────────────────────────────────────

const SETTINGS_DOC = "config/settings";

export async function getSettings() {
  const snap = await getDoc(doc(db, SETTINGS_DOC));
  if (!snap.exists()) {
    const defaults = { site_password: "timeaway123", moderator_password: "mod123" };
    await setDoc(doc(db, SETTINGS_DOC), defaults);
    return defaults;
  }
  return snap.data();
}

export async function verifySitePassword(password) {
  const s = await getSettings();
  return password === s.site_password;
}

export async function verifyModeratorPassword(password) {
  const s = await getSettings();
  return password === s.moderator_password;
}

export async function updateSitePassword(currentModPassword, newPassword) {
  const ok = await verifyModeratorPassword(currentModPassword);
  if (!ok) throw new Error("Invalid moderator password");
  await updateDoc(doc(db, SETTINGS_DOC), { site_password: newPassword });
}

export async function updateModeratorPassword(currentPassword, newPassword) {
  const ok = await verifyModeratorPassword(currentPassword);
  if (!ok) throw new Error("Invalid current password");
  await updateDoc(doc(db, SETTINGS_DOC), { moderator_password: newPassword });
}

// ─── Audit log ───────────────────────────────────────────────────────────────

async function writeAuditLog(action, performedBy, targetUsername, absenceDetails) {
  await addDoc(collection(db, "audit_logs"), {
    action,           // "user_deleted_own" | "moderator_deleted"
    performed_by: performedBy,   // username osoby która usunęła
    target_username: targetUsername, // czyja nieobecność
    absence_details: absenceDetails, // { start_date, end_date, reason }
    timestamp: serverTimestamp(),
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUser(userId) {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function upsertUser(userData) {
  const ref = doc(db, "users", userData.discord_id);
  await setDoc(ref, { ...userData, updated_at: serverTimestamp() }, { merge: true });
  return userData.discord_id;
}

// ─── Absences ─────────────────────────────────────────────────────────────────

export async function createAbsence(userId, user, startDate, endDate, reason) {
  const absence = {
    user_id: userId,
    username: user.guild_nickname || user.username,
    discord_id: user.discord_id,
    avatar: user.avatar || null,
    start_date: startDate,
    end_date: endDate,
    reason: reason || null,
    created_at: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "absences"), absence);
  return ref.id;
}

export async function getMyAbsences(userId) {
  const q = query(
    collection(db, "absences"),
    where("user_id", "==", userId),
    orderBy("start_date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllAbsences() {
  const q = query(collection(db, "absences"), orderBy("start_date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateAbsence(absenceId, userId, startDate, endDate, reason) {
  const ref = doc(db, "absences", absenceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Absence not found");
  if (snap.data().user_id !== userId) throw new Error("Not authorized");
  await updateDoc(ref, { start_date: startDate, end_date: endDate, reason: reason || null });
}

export async function deleteAbsence(absenceId, userId, username) {
  const ref = doc(db, "absences", absenceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Absence not found");
  if (snap.data().user_id !== userId) throw new Error("Not authorized");
  const data = snap.data();
  await writeAuditLog(
    "user_deleted_own",
    username,
    data.username,
    { start_date: data.start_date, end_date: data.end_date, reason: data.reason }
  );
  await deleteDoc(ref);
}

export async function moderatorDeleteAbsence(absenceId, moderatorUsername) {
  const ref = doc(db, "absences", absenceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Absence not found");
  const data = snap.data();
  await writeAuditLog(
    "moderator_deleted",
    moderatorUsername,
    data.username,
    { start_date: data.start_date, end_date: data.end_date, reason: data.reason }
  );
  await deleteDoc(ref);
}

// ─── Audit logs ───────────────────────────────────────────────────────────────

export async function getAuditLogs() {
  const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Auth tokens ─────────────────────────────────────────────────────────────

export async function consumeAuthToken(token) {
  const ref = doc(db, "auth_tokens", token);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Invalid or expired token");
  const data = snap.data();
  await deleteDoc(ref);
  return data;
}
