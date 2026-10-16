import fs from "fs";
import chalk from "chalk";
import { DisconnectReason } from "@whiskeysockets/baileys";

import { getPlugins, loadPlugins, getPluginIssues, runsOn } from "./loader.js";
import configImport from "../config.js";
import { playError, playOK } from "./sound.js";
import { normalizeJid } from "./helpers.js";
import { CONFIG_FILE, DATA_DIR, HISTORY_FILE } from "./paths.js";

/**
 * Command dispatch, shared by every connection the process holds: the main
 * number and every MD sub-bot.
 *
 * The single-account build kept the live socket in a module-level `sockGlobal`
 * and drained one buffer through it. With more than one socket that answers
 * bot B's messages on bot A's socket, so every queued message now carries the
 * connection it arrived on.
 */

let plugins = null;

/** Queue of { conn, msg }, drained in 100 ms batches. */
const messageBuffer = [];

/** Sockets that already have a connection logger bound. */
const loggedSockets = new WeakSet();

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function logToHistory(logData) {
    try {
        const timestamp = new Date().toLocaleString("en-US", { hour12: false });
        fs.appendFileSync(HISTORY_FILE, `\n[${timestamp}]\n${logData}\n`, "utf8");
    } catch (e) {
        // History is best-effort; never let logging break a command.
    }
}

global.dfail = (type, m, conn) => {
    const msg = {
        rowner: '🥐 هذا الأمر مخصص للمطور الأساسي فقط.',
        owner: '🥐 هذا الأمر مخصص لمالك البوت فقط.',
        mods: '👑 هذا الأمر مخصص للنخبة فقط.',
        premium: '👑 هذا الأمر مخصص للنخبة فقط.',
        elite: '👑 هذا الأمر مخصص للنخبة فقط.',
        developer: '🥐 هذا الأمر مخصص للمطورين فقط.',
        group: '❗ هذا الأمر يعمل في المجموعات فقط.',
        private: '❗ هذا الأمر يعمل في المحادثات الخاصة فقط.',
        admin: '🔇 عذراً، هذا الأمر لمشرفي المجموعة فقط.',
        botAdmin: '⚠️ يجب ترقية البوت مشرفاً (Admin) في المجموعة لتنفيذ هذا الأمر.',
        unreg: '❗ يرجى التسجيل أولاً لاستخدام هذا الأمر.',
        restrict: '⚠️ هذه الميزة معطلة حالياً.'
    }[type] || '⚠️ ليس لديك صلاحية لاستخدام هذا الأمر.';

    const targetChat = m?.chat || m?.key?.remoteJid;
    if (typeof m?.reply === 'function') return m.reply(msg);
    if (conn?.sendMessage && targetChat) return conn.sendMessage(targetChat, { text: msg }, { quoted: m });
};

if (!global.db) {
    global.db = {
        data: {
            users: {},
            chats: {},
            stats: {},
            msgs: {},
            sticker: {},
            settings: {}
        }
    };
}
if (!global.owner) {
    global.owner = [['962796163926', '𝐸𝓇𝑒́n', true]];
}
if (!global.botName) {
    global.botName = '『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』';
}

/**
 * Read prefix and bot/mode state straight off config.js on every message.
 *
 * The settings plugin edits config.js in place, so the running process has to
 * re-read the source rather than trust its own cached import.
 */
function getLiveSystemConfig() {
    try {
        const content = fs.readFileSync(CONFIG_FILE, "utf8");
        const prefixMatch = content.match(/let\s+prefix\s*=\s*['"](.*?)['"];/);
        const botMatch = content.match(/bot:\s*['"](on|off)['"]/);
        const modeMatch = content.match(/mode:\s*['"](on|off)['"]/);

        return {
            prefix: prefixMatch ? prefixMatch[1] : configImport.prefix,
            botState: botMatch ? botMatch[1] : "on",
            modeState: modeMatch ? modeMatch[1] : "off"
        };
    } catch (e) {
        return { prefix: configImport.prefix, botState: "on", modeState: "off" };
    }
}

async function safeSendMessage(sock, jid, msg, options = {}) {
    if (!sock || !jid) return;
    try {
        return await sock.sendMessage(jid, msg, options);
    } catch (err) {
        if (err?.data === 429) {
            await new Promise(r => setTimeout(r, 2000));
            return await sock.sendMessage(jid, msg, options);
        }
        throw err;
    }
}

/** Log connection transitions to History.txt, once per socket. */
function attachConnectionLogger(conn) {
    const { sock, label } = conn;
    if (loggedSockets.has(sock)) return;
    loggedSockets.add(sock);

    if (sock.ev?.on) {
        sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            let logMsg;

            if (statusCode === 408) {
                logMsg = "⚠ [SYSTEM CRITICAL]: Internet Connection Lost (408).";
            } else if (statusCode === 440) {
                logMsg = "👮‍♂️ [SECURITY ALERT]: Session Conflict (440).";
            } else if (statusCode === DisconnectReason.loggedOut) {
                logMsg = "⛔ [SYSTEM]: Device Logged Out.";
            } else if (statusCode === DisconnectReason.forbidden) {
                logMsg = "🚫 [SYSTEM]: Account BANNED.";
            } else {
                logMsg = `ℹ [SYSTEM]: Connection Closed (${statusCode}).`;
            }

            logToHistory(`__________________\n[${label}] ${logMsg}\n__________________`);
        }

        if (connection === "open") {
            logToHistory(`__________________\n✅ [SYSTEM]: ${label} connected (${sock.user?.id})\n__________________`);
        }
    });
}
}

export async function initializePlugins(themeColor) {
    try {
        let hexColor = themeColor || "#00FF00";
        if (!hexColor.startsWith("#")) hexColor = "#" + hexColor;

        plugins = await loadPlugins(hexColor);
        console.log(chalk.hex(hexColor).bold("🔌 PLUGINS LOADED & READY."));
    } catch (err) {
        console.error("Error loading plugins:", err);
        logToHistory(`__________________\n❌ [ERROR]: Plugin Loading Failed\nMSG: ${err.message}\n__________________`);
    }
}

/**
 * Entry point bound to each connection's `messages.upsert`.
 *
 * @param {object} conn  connection record from lib/md.js
 */
export async function handleMessages(conn, { messages }) {
    attachConnectionLogger(conn);

    if (!conn.sock.activeListeners) conn.sock.activeListeners = new Map();

    for (const msg of messages) messageBuffer.push({ conn, msg });
}

setInterval(async () => {
    if (messageBuffer.length === 0) return;

    const batch = messageBuffer.splice(0, messageBuffer.length);

    for (const { conn, msg } of batch) {
        try {
            await handleSingleMessage(conn, msg);
        } catch (err) {
            logToHistory(`__________________\n[ERROR] DISPATCH FAILED (${conn.label})\nMSG: ${err.message}\n__________________`);
        }
    }
}, 100);

async function handleSingleMessage(conn, msg) {
    if (!msg.message || !msg.key) return;

    const { sock } = conn;
    const chatId = msg.key.remoteJid;
    if (!chatId) return;

    // Unwrap nested message wrappers (ephemeral, viewOnce, documentWithCaption, etc.)
    let realMessage = msg.message;
    while (
        realMessage?.ephemeralMessage?.message ||
        realMessage?.viewOnceMessage?.message ||
        realMessage?.viewOnceMessageV2?.message ||
        realMessage?.viewOnceMessageV2Extension?.message ||
        realMessage?.documentWithCaptionMessage?.message
    ) {
        realMessage =
            realMessage.ephemeralMessage?.message ||
            realMessage.viewOnceMessage?.message ||
            realMessage.viewOnceMessageV2?.message ||
            realMessage.viewOnceMessageV2Extension?.message ||
            realMessage.documentWithCaptionMessage?.message;
    }
    msg.message = realMessage;

    const isGroup = chatId.endsWith("@g.us");
    let messageText = realMessage?.conversation ||
                      realMessage?.extendedTextMessage?.text ||
                      realMessage?.imageMessage?.caption ||
                      realMessage?.videoMessage?.caption ||
                      realMessage?.documentMessage?.caption ||
                      realMessage?.buttonsResponseMessage?.selectedButtonId ||
                      realMessage?.templateButtonReplyMessage?.selectedId ||
                      realMessage?.listResponseMessage?.singleSelectReply?.selectedRowId || "";

    if (!messageText && realMessage?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const params = JSON.parse(realMessage.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            messageText = params.id || params.selectedId || "";
        } catch {}
    }

    if (!sock.user?.id) return;

    const BIDS = {
        pn: normalizeJid(sock.user.id) + "@s.whatsapp.net",
        lid: sock.user.lid ? normalizeJid(sock.user.lid) + "@lid" : null
    };

    const sender = {
        name: msg.pushName || "Unknown",
        pn: msg.key.participantAlt ||
            (msg.key.remoteJidAlt?.endsWith("s.whatsapp.net") && msg.key.fromMe ? BIDS.pn : msg.key.remoteJidAlt) ||
            (msg.key.fromMe ? BIDS.pn : (isGroup ? msg.key.participant : chatId)),
        lid: msg.key.participant ||
             (msg.key.remoteJid?.endsWith("lid") && msg.key.fromMe ? BIDS.lid : msg.key.remoteJid) ||
             null
    };

    if (sender.pn) sender.pn = normalizeJid(sender.pn) + "@s.whatsapp.net";

    msg.chat = chatId;
    msg.isGroup = isGroup;
    msg.sender = sender.pn;
    msg.reply = (content, opts = {}) => {
        if (typeof content === 'string') {
            return safeSendMessage(sock, chatId, { text: content, ...opts }, { quoted: msg });
        }
        return safeSendMessage(sock, chatId, { ...content, ...opts }, { quoted: msg });
    };
    msg.react = (emoji) => {
        return safeSendMessage(sock, chatId, {
            react: { text: emoji, key: msg.key }
        });
    };

    if (!sock.reply) {
        sock.reply = (jid, text, quoted, options = {}) => {
            if (typeof text === 'string') {
                return safeSendMessage(sock, jid, { text, ...options }, { quoted });
            }
            return safeSendMessage(sock, jid, { ...text, ...options }, { quoted });
        };
    }
    if (!sock.getName) {
        sock.getName = async (jid) => {
            const id = normalizeJid(jid || '');
            if (!id) return '';
            if (id.endsWith('@g.us')) {
                const metadata = await sock.groupMetadata(id).catch(() => null);
                return metadata?.subject || id;
            }
            return id.split('@')[0];
        };
    }
    conn.reply = sock.reply;
    conn.getName = sock.getName;

    if (sender.pn && !global.db.data.users[sender.pn]) {
        global.db.data.users[sender.pn] = { points: 0, exp: 0, level: 1 };
    }
    if (chatId && !global.db.data.chats[chatId]) {
        global.db.data.chats[chatId] = { isBanned: false, welcome: false, antilink: false };
    }

    //@Eren/changes Add quoted message structure and media download helper
    const contextInfo = realMessage?.extendedTextMessage?.contextInfo ||
                        realMessage?.imageMessage?.contextInfo ||
                        realMessage?.videoMessage?.contextInfo ||
                        realMessage?.audioMessage?.contextInfo ||
                        realMessage?.documentMessage?.contextInfo ||
                        realMessage?.stickerMessage?.contextInfo || {};
    if (contextInfo.quotedMessage) {
        const qm = contextInfo.quotedMessage;
        const mime = qm.imageMessage?.mimetype ||
                     qm.videoMessage?.mimetype ||
                     qm.audioMessage?.mimetype ||
                     qm.stickerMessage?.mimetype ||
                     qm.documentMessage?.mimetype || '';

        msg.quoted = {
            id: contextInfo.stanzaId,
            chat: chatId,
            sender: contextInfo.participant || chatId,
            mimetype: mime,
            msg: qm.imageMessage || qm.videoMessage || qm.audioMessage || qm.stickerMessage || qm.documentMessage || qm,
            message: qm,
            download: async () => {
                const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
                const mediaMsg = qm.imageMessage || qm.videoMessage || qm.audioMessage || qm.stickerMessage || qm.documentMessage;
                if (!mediaMsg) throw new Error("No media in quoted message");
                const type = qm.imageMessage ? 'image' : (qm.videoMessage ? 'video' : (qm.audioMessage ? 'audio' : (qm.stickerMessage ? 'sticker' : 'document')));
                const stream = await downloadContentFromMessage(mediaMsg, type);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                return buffer;
            }
        };
    } else {
        msg.quoted = null;
    }

    msg.getQuotedObj = async () => msg.quoted;

    msg.download = async () => {
        const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
        const mediaMsg = realMessage?.imageMessage || realMessage?.videoMessage || realMessage?.audioMessage || realMessage?.stickerMessage || realMessage?.documentMessage;
        if (!mediaMsg) throw new Error("No media in message");
        const type = realMessage?.imageMessage ? 'image' : (realMessage?.videoMessage ? 'video' : (realMessage?.audioMessage ? 'audio' : (realMessage?.stickerMessage ? 'sticker' : 'document')));
        const stream = await downloadContentFromMessage(mediaMsg, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        return buffer;
    };

    // Check if an active conversation listener handles this message
    const listenerKey = `${chatId}_${sender.pn}`;
    const activeListener = sock.activeListeners?.get(listenerKey) || sock.activeListeners?.get(chatId);
    if (activeListener) {
        const handlerFn = typeof activeListener === 'function' ? activeListener : activeListener.handler;
        if (typeof handlerFn === 'function') {
            const handled = await handlerFn({ conn, sock, msg, text: messageText, sender, chatId, isGroup, BIDS });
            if (handled !== false) return;
        }
    }

    const { prefix, botState, modeState } = getLiveSystemConfig();
    const trimmedText = messageText.trim();
    let command = "";
    let args = [];

    if (trimmedText.startsWith(prefix)) {
        args = trimmedText.slice(prefix.length).trim().split(/\s+/);
        command = args.shift()?.toLowerCase();
    } else if (trimmedText === "بوت") {
        command = "بوت";
        args = [];
    } else {
        return;
    }
    if (!command) return;

    msg.args = args;

    // The configured owner owns every number. A sub-bot's installer is owner of
    // that sub-bot only, never of the main number or of anyone else's sub-bot.
    const ownerNumber = configImport.owner ? configImport.owner.toString().replace(/\D/g, "") : "";
    const isGlobalOwner = !!ownerNumber && sender.pn === ownerNumber + "@s.whatsapp.net";
    const isConnOwner = !conn.isMain && !!conn.ownerJid &&
                        normalizeJid(sender.pn) === normalizeJid(conn.ownerJid);
    const isOwner = isGlobalOwner || isConnOwner;

    let groupMetadata = null;
    let participants = [];
    let isGroupAdmin = false;
    let isBotAdmin = false;

    if (isGroup) {
        try {
            groupMetadata = await sock.groupMetadata(chatId);
            participants = groupMetadata?.participants || [];
            const senderParticipant = participants.find(p =>
                p.id === sender.pn || p.id === sender.lid || p.id?.split('@')[0] === sender.pn?.split('@')[0]
            );
            isGroupAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';

            const botParticipant = participants.find(p =>
                p.id === BIDS.pn || p.id === BIDS.lid || p.id?.split('@')[0] === BIDS.pn?.split('@')[0]
            );
            isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
        } catch (e) {}
    }
    const isAdmin = isOwner || isGroupAdmin;

    let senderIsElite = false;
    try {
        senderIsElite = await sock.isElite({ sock, id: sender.pn });
    } catch (e) {
        senderIsElite = false;
    }

    //@Eren/changes Developer rank check
    let senderIsDeveloper = false;
    try {
        senderIsDeveloper = await sock.isDeveloper({ sock, id: sender
