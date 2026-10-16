/**
 * Small utilities merged onto every socket (see lib/connect.js) plus the
 * standalone helpers plugins import directly.
 *
 * Was accounts/IZEN/handlers/waUtils.js + accounts/IZEN/utils/sleep.js.
 */

/** Pause execution. */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** The author of the message this one replies to, as a one-element array. */
export function replyedJid(msg) {
    const participant = msg?.message?.extendedTextMessage?.contextInfo?.participant;
    return participant ? [participant] : null;
}

/** Every jid @-mentioned in the message, or null when there are none. */
export function mentionnedJids(msg) {
    const jids = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    return Array.isArray(jids) && jids.length > 0 ? jids.filter(Boolean) : null;
}

/** Strip the device and server parts off a jid: "2011:3@s.whatsapp.net" -> "2011". */
export function normalizeJid(jid) {
    return jid ? String(jid).split('@')[0].split(':')[0] : '';
}

/** The phone-number jid of whichever number a socket is logged in as. */
export function botJidOf(sock) {
    const id = sock?.user?.id;
    return id ? normalizeJid(id) + '@s.whatsapp.net' : null;
}

const helpers = { sleep, replyedJid, mentionnedJids, normalizeJid };
export default helpers;
