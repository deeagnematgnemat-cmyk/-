import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../../lib/paths.js';
import {
    MD_PAIR_CODE,
    getMainConn,
    getMdBot,
    listMdBots,
    listMdSessionsOnDisk,
    startMdBot,
    stopMdBot
} from "../../lib/md.js";

// ملف حفظ حالة قفل/إيقاف التنصيب
const MD_LOCK_FILE = path.join(DATA_DIR, 'md_lock.json');

function getMdLockStatus() {
    try {
        if (!fs.existsSync(MD_LOCK_FILE)) return false;
        const data = JSON.parse(fs.readFileSync(MD_LOCK_FILE, 'utf8'));
        return !!data.locked;
    } catch (e) {
        return false;
    }
}

function setMdLockStatus(status) {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(MD_LOCK_FILE, JSON.stringify({ locked: status }, null, 2), 'utf8');
    } catch (e) {
        console.error("Error saving MD lock status:", e);
    }
}

/**
 * MD sub-bots: pair another number into this running bot.
 * 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』
 */
const EREN = {
    command: "تنصيب",
    description: "لتنصيب رقم جديد على البوت (MD) وعرضه وحذفه - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
    elite: "off",
    lock: "off",
    group: false,
    prv: false,
    aizen: "on",
    md: "off"
};

const digitsOf = (value) => String(value || "").replace(/\D/g, "");

async function showList({ sock, msg, chatId }) {
    const live = listMdBots();
    const onDisk = await listMdSessionsOnDisk();
    const offline = onDisk.filter(n => !live.some(bot => bot.number === n));

    let text = `*『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - الأرقام المنصّبة (MD)*\n\n`;

    if (!live.length && !offline.length) {
        text += "`𝕏 لا يوجد أي رقم منصّب.`\n\nأرسل *تنصيب* من الرقم الذي تريد ربطه.";
        return sock.sendMessage(chatId, { text }, { quoted: msg });
    }

    if (live.length) {
        text += `*متصل الآن :*\n`;
        live.forEach((bot, i) => {
            const minutes = Math.floor((Date.now() - bot.startedAt) / 60000);
            text += `${i + 1}. ${bot.number} — منذ ${minutes} دقيقة\n`;
        });
        text += `\n`;
    }

    if (offline.length) {
        text += `*غير متصل :*\n${offline.map(n => `• ${n}`).join("\n")}\n\n`;
    }

    text += `\`تنصيب حذف <رقم>\` لإزالة تنصيب رقم.`;
    return sock.sendMessage(chatId, { text }, { quoted: msg });
}

async function removeBot({ sock, msg, chatId, args, sender, isOwner }) {
    const target = digitsOf(args[1]);

    if (!target) {
        return sock.sendMessage(chatId, {
            text: "𝕏 اكتب الرقم بعد الأمر :\n`تنصيب حذف 201009579295`"
        }, { quoted: msg });
    }

    const isSelf = target === digitsOf(sender.pn);
    if (!isSelf && !isOwner) {
        return sock.sendMessage(chatId, {
            text: "🚫 يمكنك إزالة تنصيب رقمك فقط."
        }, { quoted: msg });
    }

    const known = getMdBot(target) || (await listMdSessionsOnDisk()).includes(target);
    if (!known) {
        return sock.sendMessage(chatId, {
            text: `⚠️ الرقم ${target} غير منصّب.`
        }, { quoted: msg });
    }

    await stopMdBot(target, { remove: true });
    return sock.sendMessage(chatId, {
        text: `✔ تم إزالة تنصيب الرقم ${target}.`
    }, { quoted: msg });
}

async function execute({ sock, msg, args, sender, isOwner }) {
    const chatId = msg.key.remoteJid;
    const sub = (args[0] || "").trim();

    // أوامر التحكم الإضافية (إيقاف وتفعيل التنصيب)
    if (sub === "ايقاف" && args[1] === "تنصيب") {
        if (!isOwner) {
            return sock.sendMessage(chatId, { text: "🚫 هذا الأمر مخصص للمطور فقط." }, { quoted: msg });
        }
        setMdLockStatus(true);
        return sock.sendMessage(chatId, { text: "🛑 *تم إيقاف نظام التنصيب بنجاح.*\nلن يتمكن أحد من تنصيب أرقام جديدة حتى إعارته للتفعيل." }, { quoted: msg });
    }

    if (sub === "تفعيل" && args[1] === "تنصيب") {
        if (!isOwner) {
            return sock.sendMessage(chatId, { text: "🚫 هذا الأمر مخصص للمطور فقط." }, { quoted: msg });
        }
        setMdLockStatus(false);
        return sock.sendMessage(chatId, { text: "✅ *تم تفعيل نظام التنصيب وعودته للوضع الطبيعي.*" }, { quoted: msg });
    }

    // التحقق مما إذا كان التنصيب موقوفاً
    if (getMdLockStatus() && !isOwner) {
        return sock.sendMessage(chatId, { text: "⚠️ نظام التنصيب متوقف حالياً من قبل المطور." }, { quoted: msg });
    }

    if (sub === "قائمة" || sub === "لست" || sub.toLowerCase() === "list") {
        return showList({ sock, msg, chatId });
    }

    if (sub === "حذف" || sub === "الغاء" || sub.toLowerCase() === "remove") {
        return removeBot({ sock, msg, chatId, args, sender, isOwner });
    }

    const argNumber = digitsOf(sub);
    if (argNumber && !isOwner) {
        return sock.sendMessage(chatId, {
            text: "🚫 أرسل *تنصيب* بدون رقم — يُنصَّب الرقم الذي تكتب منه.\nتحديد رقم آخر متاح للمالك فقط."
        }, { quoted: msg });
    }

    const target = argNumber || digitsOf(sender.pn);

    if (!target || target.length < 6) {
        return sock.sendMessage(chatId, {
            text: "𝕏 تعذّر تحديد الرقم. أرسل الأمر من الرقم الذي تريد تنصيبه."
        }, { quoted: msg });
    }

    const main = getMainConn();
    if (main && digitsOf(main.jid) === target) {
        return sock.sendMessage(chatId, {
            text: "⚠️ هذا هو رقم البوت الرئيسي، وهو يعمل بالفعل."
        }, { quoted: msg });
    }

    if (getMdBot(target)) {
        return sock.sendMessage(chatId, {
            text: `✔ الرقم ${target} منصّب ومتصل بالفعل.\nأرسل \`تنصيب حذف ${target}\` لإزالته.`
        }, { quoted: msg });
    }

    await sock.sendMessage(chatId, {
        text: `⏳ جاري تحضير تنصيب الرقم ${target} عبر 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』...\nكود الربط سيصلك هنا خلال ثوانٍ.`
    }, { quoted: msg });

    try {
        await startMdBot(target, {
            ownerJid: sender.pn,
            requesterJid: chatId,
            notifyVia: sock
        });
    } catch (err) {
        await sock.sendMessage(chatId, {
            text: `𝕏 فشل التنصيب : ${err.message}\n\nأعد المحاولة بإرسال *تنصيب*.`
        }, { quoted: msg });
    }
}

export default { EREN, AIZEN: EREN, execute, MD_PAIR_CODE };
