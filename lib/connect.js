import fs from "fs-extra";
import path from "path";
import pino from "pino";
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";

import elite from "./elite.js";
import developer from "./developer.js";
import helpers, { normalizeJid } from "./helpers.js";
import configImport from "../config.js";

// Silence noisy libsignal session decryption stack traces (Bad MAC loops)
if (!global.__libsignalSilenced) {
    global.__libsignalSilenced = true;
    const origConsoleError = console.error.bind(console);
    console.error = (...args) => {
        const str = typeof args[0] === 'string' ? args[0] : '';
        if (
            str.includes('Failed to decrypt message with any known session') ||
            str.includes('Session error:Error: Bad MAC') ||
            str.includes('Session error:Bad MAC') ||
            str.includes('Bad MAC Error: Bad MAC')
        ) {
            return;
        }
        origConsoleError(...args);
    };
}

/**
 * Safely handles corrupted session cleanup for external contacts only.
 * NEVER deletes bot's own pairing session or the owner's session.
 */
async function repairCorruptedSession(dir, rawJid, sock) {
    if (!rawJid) return;
    const user = rawJid.split('@')[0].split(':')[0];
    if (!user) return;

    // Never touch bot's own number, LID, or owner's number
    const owner = configImport.owner ? configImport.owner.toString().replace(/\D/g, '') : '';
    const botUser = sock?.user?.id ? sock.user.id.split('@')[0].split(':')[0] : '';
    const botLid = sock?.user?.lid ? sock.user.lid.split('@')[0].split(':')[0] : '';
    const protectedIds = new Set(['962796163926', '962795106901', owner, botUser, botLid].filter(Boolean));

    if (protectedIds.has(user)) return;

    const targets = new Set([user]);

    try {
        const lidMapFile = path.join(dir, `lid-mapping-${user}.json`);
        if (await fs.pathExists(lidMapFile)) {
            const mapped = (await fs.readFile(lidMapFile, 'utf-8')).replace(/["\s]/g, '');
            if (mapped && !protectedIds.has(mapped)) targets.add(mapped);
        }
        const revMapFile = path.join(dir, `lid-mapping-${user}_reverse.json`);
        if (await fs.pathExists(revMapFile)) {
            const mapped = (await fs.readFile(revMapFile, 'utf-8')).replace(/["\s]/g, '');
            if (mapped && !protectedIds.has(mapped)) targets.add(mapped);
        }
    } catch {}

    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            if (file.startsWith('session-')) {
                for (const t of targets) {
                    if (file.includes(t)) {
                        await fs.unlink(path.join(dir, file)).catch(() => {});
                        break;
                    }
                }
            }
        }
    } catch {}
}

/**
 * Socket construction, shared by the main number and every MD sub-bot.
 *
 * Only the auth folder differs between them, so both go through here and get
 * the same helpers, the same elite lookup and the same retry-receipt store.
 */

/** How many recent messages to keep for answering retry receipts. */
const SENT_CACHE_MAX = 200;

/**
 * Remembering what we sent is what stops the recipient's phone sitting on
 * "Waiting for this message": when a client fails to decrypt, WhatsApp asks the
 * sender to re-serve the original, and Baileys can only do that through
 * `getMessage`. The old build passed `getMessageHistory`, which is not a Baileys
 * option at all, so nothing was ever re-served.
 */
function makeMessageStore() {
    const map = new Map();

    return {
        save(key, message) {
            if (!key?.id || !message) return;
            map.set(key.id, message);
            if (map.size > SENT_CACHE_MAX) map.delete(map.keys().next().value);
        },
        get(id) {
            return id ? map.get(id) : undefined;
        }
    };
}

/**
 * Build a socket for one number.
 *
 * @param {string} dir  auth folder — session/ for the main bot, md_sessions/<n>/ for a sub-bot
 * @returns {Promise<{ sock: object, state: object, saveCreds: Function }>}
 */
export async function createSocket(dir) {
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    const store = makeMessageStore();

    const sock = makeWASocket({
        auth: state,
        version,
        browser: ["MacOS", "Chrome", "1.0.0"],
        logger: pino({ level: "silent" }),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        getMessage: async (key) => store.get(key?.id)
    });

    // Mutate the socket in place. Spreading it snapshots Baileys' `user` getter,
    // which then stops tracking the logged-in number after a relogin — the same
    // reason @aizen/baileys' withInteractive mutates instead of copying.
    Object.assign(sock, developer, elite, helpers);

    // Record outgoing messages so getMessage above can answer retry receipts.
    const origSend = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options) => {
        const sent = await origSend(jid, content, options);
        if (sent?.key && sent?.message) store.save(sent.key, sent.message);
        return sent;
    };

    // Anything sent straight through relayMessage has to be recorded here too.
    // relayMessage emits no messages.upsert and returns no WebMessageInfo, so it
    // is invisible to both hooks above — and the AIZEN styling block that
    // settings.js injects into other plugins replaces sock.sendMessage on this
    // very socket with a generateWAMessageFromContent + relayMessage pair. Every
    // styled reply therefore used to leave the store empty, and the recipient sat
    // on "Waiting for this message" because the retry receipt could not be
    // answered.
    // Recorded before the relay, not after: a relay that reaches some of the
    // recipient's devices and then throws still produces retry receipts, and
    // those have to be answerable.
    const origRelay = sock.relayMessage.bind(sock);
    sock.relayMessage = async (jid, message, options = {}) => {
        if (options?.messageId) store.save({ id: options.messageId }, message);
        return origRelay(jid, message, options);
    };

    sock.ev.on("messages.upsert", async ({ messages }) => {
        for (const m of messages) {
            if (m?.key?.fromMe && m.message) store.save(m.key, m.message);
            // Auto-heal session if decryption failed (Bad MAC / CIPHERTEXT)
            if (m?.messageStubType === 2 /* CIPHERTEXT */) {
                const sender = m.key?.participant || m.key?.remoteJid;
                await repairCorruptedSession(dir, sender, sock);
            }
        }
    });

    sock.ev.on("messages.update", async (updates) => {
        for (const u of updates) {
            if (u?.update?.messageStubType === 2 /* CIPHERTEXT */) {
                const sender = u.key?.participant || u.key?.remoteJid;
                await repairCorruptedSession(dir, sender, sock);
            }
        }
    });

    // The configured owner counts as elite on every number, without the old
    // patch-then-restore dance around each command (which raced when two
    // commands ran at once).
    const ownerNumber = configImport.owner ? configImport.owner.toString().replace(/\D/g, "") : "";
    const lookupElite = elite.isElite;

    sock.isElite = async (opts) => {
        const id = opts?.id ?? opts;
        if (!id) return false;
        if (ownerNumber && normalizeJid(id) === ownerNumber) return true;
        try {
            return await lookupElite({ sock, id });
        } catch (e) {
            return false;
        }
    };

    //@Eren/changes Developer rank lookup with owner fallback
    const lookupDeveloper = developer.isDeveloper;
    sock.isDeveloper = async (opts) => {
        const id = opts?.id ?? opts;
        if (!id) return false;
        if (ownerNumber && normalizeJid(id) === ownerNumber) return true;
        try {
            return await lookupDeveloper({ sock, id });
        } catch (e) {
            return false;
        }
    };
    sock.isDevolper = sock.isDeveloper;

    sock.ev.on("creds.update", saveCreds);

    return { sock, state, saveCreds };
}
