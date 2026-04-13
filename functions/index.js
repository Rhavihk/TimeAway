const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fetch = require("node-fetch");
const crypto = require("crypto");
const nacl = require("tweetnacl");

initializeApp();
const db = getFirestore();

// ─── Discord OAuth callback ───────────────────────────────────────────────────
exports.discordCallback = onRequest(
  { secrets: ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "FRONTEND_URL"], cors: true },
  async (req, res) => {
    const { code, state } = req.query;
    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://rhavihk.github.io/TimeAway";
    const REDIRECT_URI = "https://us-central1-timeaway-22254.cloudfunctions.net/discordCallback";

    console.log("=== Discord Callback ===");
    console.log("code:", code ? "present" : "missing");
    console.log("FRONTEND_URL:", FRONTEND_URL);

    if (!code) {
      return res.redirect(`${FRONTEND_URL}/#/auth/callback?error=no_code`);
    }

    try {
      const tokenBody = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      });

      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody,
      });

      const tokenText = await tokenRes.text();
      console.log("Token response status:", tokenRes.status);

      if (!tokenRes.ok) {
        throw new Error(`Token exchange failed: ${tokenRes.status} - ${tokenText}`);
      }

      const { access_token } = JSON.parse(tokenText);

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!userRes.ok) throw new Error("Failed to fetch Discord user");
      const discordUser = await userRes.json();

      const guildId = state && state !== "no_guild" ? state : null;
      let guildNickname = discordUser.global_name || discordUser.username;

      if (guildId) {
        try {
          const memberRes = await fetch(
            `https://discord.com/api/users/@me/guilds/${guildId}/member`,
            { headers: { Authorization: `Bearer ${access_token}` } }
          );
          if (memberRes.ok) {
            const member = await memberRes.json();
            guildNickname = member.nick || discordUser.global_name || discordUser.username;
          }
        } catch (_) {}
      }

      const token = crypto.randomBytes(32).toString("hex");
      const userData = {
        discord_id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || "0",
        avatar: discordUser.avatar || null,
        guild_id: guildId,
        guild_nickname: guildNickname,
        expires_at: Date.now() + 5 * 60 * 1000,
      };
      await db.collection("auth_tokens").doc(token).set(userData);

      res.redirect(`${FRONTEND_URL}/#/auth/callback?token=${token}`);
    } catch (err) {
      console.error("Discord OAuth error:", err.message);
      res.redirect(`${FRONTEND_URL}/#/auth/callback?error=${encodeURIComponent(err.message)}`);
    }
  }
);

// ─── Discord Slash Command (/zgłoś) ──────────────────────────────────────────
exports.discordSlash = onRequest(
  { secrets: ["DISCORD_PUBLIC_KEY", "FRONTEND_URL"], cors: false },
  async (req, res) => {
    const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://rhavihk.github.io/TimeAway";

    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];
    const rawBody = JSON.stringify(req.body);

    try {
      const isValid = nacl.sign.detached.verify(
        Buffer.from(timestamp + rawBody),
        Buffer.from(signature, "hex"),
        Buffer.from(DISCORD_PUBLIC_KEY, "hex")
      );
      if (!isValid) return res.status(401).send("Invalid signature");
    } catch (e) {
      return res.status(401).send("Invalid signature");
    }

    const { type, data } = req.body;

    if (type === 1) return res.json({ type: 1 });

    if (type === 2 && data?.name === "zgłoś") {
      return res.json({
        type: 4,
        data: {
          content: `📅 **TimeAway — Zgłoś nieobecność**\n\nKliknij poniższy link aby zgłosić swoją nieobecność na kalendarzu:\n👉 ${FRONTEND_URL}\n\n*Link widoczny tylko dla Ciebie*`,
          flags: 64,
        },
      });
    }

    return res.status(400).json({ error: "Unknown interaction type" });
  }
);

// ─── Scheduled cleanup ────────────────────────────────────────────────────────
exports.cleanupExpiredAbsences = onSchedule("every 1 hours", async () => {
  const now = new Date();

  // Usuń nieobecności starsze niż 24h
  const absenceCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const absenceCutoffStr = absenceCutoff.toISOString().split("T")[0];

  const absenceSnap = await db.collection("absences")
    .where("end_date", "<", absenceCutoffStr).get();

  if (!absenceSnap.empty) {
    const batch = db.batch();
    absenceSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(`Cleanup absences: usunięto ${absenceSnap.docs.length}`);
  }

  // Usuń audit logi starsze niż 7 dni
  const logCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const logSnap = await db.collection("audit_logs")
    .where("timestamp", "<", logCutoff).get();

  if (!logSnap.empty) {
    const batch2 = db.batch();
    logSnap.docs.forEach((d) => batch2.delete(d.ref));
    await batch2.commit();
    console.log(`Cleanup audit_logs: usunięto ${logSnap.docs.length}`);
  }
});
