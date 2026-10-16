import fs from "fs-extra";
import chalk from "chalk";
import { Boom } from "@hapi/boom";
import { DisconnectReason } from "@whiskeysockets/baileys";

import { createSocket } from "./connect.js";
import { handleMessages } from "./handler.js";
import { normalizeJid } from "./helpers.js";
import { MD_SESSIONS_DIR, SESSION_DIR, mdSessionDir, LOGO_FILE } from "./paths.js";

/**
 * MD sub-bots.
 *
 * A second number joins the running bot by sending the `تنصيب` command: this
 * module opens a socket for it under md_sessions/<number>/, hands back the
 * pairing code, and from then on that socket dispatches through the same
 * plugin registry as the main number.
 *
 * Every socket lives in this one process. Forking a Node process per sub-bot
 * would cost roughly 80 MB each, which Termux does not have to spare.
 */

/** The custom pairing code sub-bots are asked to type. Baileys requires exactly 8 chars. */
export const MD_PAIR_CODE = "ERENBOT2";

/** number -> connection record. The main bot is stored under the key "main". */
const connections = new Map();

const MAX_RECONNECT = 5;
const RECONNECT_DELAY = 5000;
const PAIR_READY_TIMEOUT = 30000;

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function safeSend(sock, jid, content) {
    if (!sock || !jid) return;
    try {
        await sock.sendMessage(jid, content);
    } catch (e) {
        console.log(chalk.yellow(`[MD] could not notify ${jid}: ${e.message}`));
    }
}

/**
 * Register the main number's socket and start dispatching its messages.
 * @returns {object} the main connection record
 */
export function registerMain(sock) {
    const conn = {
        key: "main",
        number: normalizeJid(sock.user?.id) || "main",
        jid: sock.user?.id || null,
        dir: SESSION_DIR,
        sock,
        isMain: true,
        ownerJid: null,
        label: "MAIN",
        startedAt: Date.now()
    };

    connections.set("main", conn);
    sock.ev.on("messages.upsert", (ev) => handleMessages(conn, ev));
    return conn;
}

export function getMainConn() {
    return connections.get("main") || null;
}

/** Every live connection, main number first. */
export function getConnections() {
    return [...connections.values()];
}

/** Live sub-bots only. */
export function listMdBots() {
    return [...connections.values()].filter(c => !c.isMain);
}

export function getMdBot(number) {
    return connections.get(normalizeJid(number)) || null;
}

/** Numbers with creds on disk, whether or not they are currently connected. */
export async function listMdSessionsOnDisk() {
    if (!await fs.pathExists(MD_SESSIONS_DIR)) return [];

    const entries = await fs.readdir(MD_SESSIONS_DIR, { withFileTypes: true });
    const out = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (await fs.pathExists(mdSessionDir(entry.name) + "/creds.json")) out.push(entry.name);
    }
    return out;
}

/**
 * Wait until the socket is ready to be handed a pairing request.
 *
 * A `qr` in connection.update means the websocket handshake finished and the
 * server is waiting for us to pair, which is exactly when requestPairingCode
 * can be called.
 */
function waitForPairReady(sock, timeout = PAIR_READY_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            sock.ev.off("connection.update", onUpdate);
            reject(new Error("timed out waiting for the pairing handshake"));
        }, timeout);

        function onUpdate(update) {
            if (update.qr || update.connection === "open") {
                clearTimeout(timer);
                sock.ev.off("connection.update", onUpdate);
                resolve();
            }
            if (update.connection === "close") {
                clearTimeout(timer);
                sock.ev.off("connection.update", onUpdate);
                reject(new Error("connection closed before pairing"));
            }
        }

        sock.ev.on("connection.update", onUpdate);
    });
}

/**
 * Start (or restore) one sub-bot.
 *
 * @param {string} number         digits only, no + and no server part
 * @param {object} [opts]
 * @param {string} [opts.ownerJid]     jid that installed this sub-bot; owner of it
 * @param {string} [opts.requesterJid] chat to report progress into
 * @param {object} [opts.notifyVia]    socket to send that progress through
 * @param {boolean} [opts.pair]        request a pairing code when unregistered (default true)
 * @param {number} [opts.attempt]      internal: reconnect counter
 */
export async function startMdBot(number, opts = {}) {
    const key = normalizeJid(number);
    if (!key || !/^\d{6,}$/.test(key)) {
        throw new Error("رقم غير صالح — أرسل الأرقام فقط بدون + أو مسافات.");
    }

    const main = getMainConn();
    if (main && normalizeJid(main.jid) === key) {
        throw new Error("هذا هو رقم البوت الرئيسي.");
    }
    if (connections.has(key)) {
        throw new Error("هذا الرقم مُنصَّب ومتصل بالفعل.");
    }

    const {
        ownerJid = null,
        requesterJid = null,
        notifyVia = main?.sock || null,
        pair = true,
        attempt = 0
    } = opts;

    const dir = mdSessionDir(key);
    await fs.ensureDir(dir);

    const { sock, state } = await createSocket(dir);

    const conn = {
        key,
        number: key,
        jid: `${key}@s.whatsapp.net`,
        dir,
        sock,
        isMain: false,
        ownerJid: ownerJid || `${key}@s.whatsapp.net`,
        label: `MD:${key}`,
        startedAt: Date.now()
    };

    sock.ev.on("messages.upsert", (ev) => handleMessages(conn, ev));

    if (!state.creds.registered && pair) {
        try {
            await waitForPairReady(sock);
            await delay(1200);

            let code;
            try {
                code = await sock.requestPairingCode(key, MD_PAIR_CODE);
            } catch (err) {
                // WhatsApp can refuse a specific custom code; a server-generated
                // one still pairs, so fall back rather than abandon the install.
                console.log(chalk.yellow(`[MD] custom code refused for ${key}: ${err.message}`));
                code = await sock.requestPairingCode(key);
            }

            const pretty = code?.match(/.{1,4}/g)?.join("-") || code;

            console.log(chalk.cyan(`[MD] pairing code for ${key}: ${pretty}`));

            await safeSend(notifyVia, requesterJid, {
                text: `ꚸ *تنصيب رقم جديد*\n\n` +
                      `𝖭𝖴𝖬 : ${key}\n` +
                      `𝖢𝖮𝖣𝖤 : *${pretty}*\n\n` +
                      `الخطوات :\n` +
                      `1. واتساب ← الإعدادات\n` +
                      `2. الأجهزة المرتبطة\n` +
                      `3. ربط جهاز ← *الربط برقم الهاتف*\n` +
                      `4. أدخل الكود أعلاه\n\n` +
                      `⏳ الكود صالح لدقائق قليلة.`
            });
        } catch (err) {
            connections.delete(key);
            try { sock.end(undefined); } catch (e) {}
            await safeSend(notifyVia, requesterJid, { text: `𝕏 فشل التنصيب : ${err.message}` });
            throw err;
        }
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            conn.jid = sock.user?.id || conn.jid;
            connections.set(key, conn);
            console.log(chalk.green(`[MD] ${key} connected`));
            await safeSend(notifyVia, requesterJid, { text: `ꚸ تم تنصيب الرقم ${key} وهو يعمل الآن.` });

            //@Eren/changes Sub-bot setup: upload Logo profile picture
            if (await fs.pathExists(LOGO_FILE)) {
                try {
                    const logoBuf = await fs.readFile(LOGO_FILE);
                    await sock.updateProfilePicture(sock.user?.id, logoBuf);
                    console.log(chalk.green(`[MD] ${key} profile picture updated`));
                } catch (e) {
                    console.log(chalk.yellow(`[MD] could not set profile picture for ${key}: ${e.message}`));
                }
            }

            //@Eren/changes Send welcome message with speed-test button
            try {
                const welcomeJid = conn.ownerJid || `${key}@s.whatsapp.net`;
                const welcomeMsg = `𝘺𝘰𝘶𝘳 𝘯𝘶𝘮𝘣𝘦𝘳 𝘪𝘴 𝘴𝘶𝘤𝘤𝘦𝘴𝘴𝘧𝘶𝘭𝘭𝘺 𝘤𝘰𝘯𝘯𝘦𝘤𝘵𝘦𝘥 𝘵𝘰 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝐨𝓉 『✦』 🌹`;
                if (await fs.pathExists(LOGO_FILE)) {
                    const logoBuf = await fs.readFile(LOGO_FILE);
                    await sock.sendMessage(welcomeJid, {
                        image: logoBuf,
                        caption: welcomeMsg,
                        buttons: [
                            { text: "اختبار سرعة البوت", id: ".تست" }
                        ]
                    });
                } else {
                    await sock.sendMessage(welcomeJid, {
                        text: welcomeMsg,
                        buttons: [
                            { text: "اختبار سرعة البوت", id: ".تست" }
                        ]
                    });
                }
            } catch (e) {
                console.log(chalk.yellow(`[MD] could not send welcome message to ${key}: ${e.message}`));
            }

            return;
        }

        if (connection !== "close") return;

        connections.delete(key);

        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const isGone = statusCode === DisconnectReason.loggedOut ||
                       statusCode === DisconnectReason.forbidden ||
                       statusCode === 401;

        if (isGone) {
            console.log(chalk.red(`[MD] ${key} logged out (${statusCode}) — removing its session`));
            try { sock.end(undefined); } catch (e) {}
            await fs.remove(dir);
            await safeSend(notifyVia, requesterJid, {
                text: `🔇 الرقم ${key} تم فصله من الأجهزة المرتبطة، وأُزيل تنصيبه.\nأرسل *تنصيب* من جديد لإعادة الربط.`
            });
            return;
        }

        if (attempt + 1 > MAX_RECONNECT) {
            console.log(chalk.red(`[MD] ${key} gave up after ${MAX_RECONNECT} reconnects`));
            try { sock.end(undefined); } catch (e) {}
            await safeSend(notifyVia, requesterJid, { text: `⚠ تعذّر إعادة اتصال الرقم ${key}. أرسل *تنصيب* لإعادة المحاولة.` });
            return;
        }

        console.log(chalk.yellow(`[MD] ${key} closed (${statusCode}) — reconnecting in ${RECONNECT_DELAY / 1000}s`));
        try { sock.end(undefined); } catch (e) {}
        await delay(RECONNECT_DELAY);

        startMdBot(key, { ...opts, pair: false, attempt: attempt + 1 })
            .catch(err => console.log(chalk.red(`[MD] reconnect of ${key} failed: ${err.message}`)));
    });

    // Registered sessions are usable straight away; unregistered ones appear in
    // the registry once 'open' fires above.
    if (state.creds.registered) connections.set(key, conn);

    return conn;
}

/**
 * Disconnect a sub-bot. Pass remove:true to delete its creds as well, which
 * means the number has to run تنصيب again to come back.
 */
export async function stopMdBot(number, { remove = false } = {}) {
    const key = normalizeJid(number);
    const conn = connections.get(key);

    if (conn) {
        connections.delete(key);
        try { conn.sock.ev.removeAllListeners("connection.update"); } catch (e) {}
        try { conn.sock.end(undefined); } catch (e) {}
    }

    if (remove) await fs.remove(mdSessionDir(key));

    return { stopped: !!conn, removed: remove };
}

/**
 * Bring back every sub-bot that has creds on disk, staggered so a dozen of them
 * do not all handshake at once.
 */
export async function restoreMdBots(notifyVia = null) {
    const numbers = await listMdSessionsOnDisk();
    if (!numbers.length) return [];

    console.log(chalk.cyan(`[MD] restoring ${numbers.length} sub-bot(s)`));
    const restored = [];

    for (const number of numbers) {
        try {
            await startMdBot(number, { pair: false, notifyVia });
            restored.push(number);
        } catch (err) {
            console.log(chalk.red(`[MD] could not restore ${number}: ${err.message}`));
        }
        await delay(2000);
    }

    return restored;
}
