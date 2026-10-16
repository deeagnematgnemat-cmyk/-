//@Eren/changes Customized for Eren framework
//@Eren/note تغيير بيانات الجروب + تنزيل الأدمن + طرد الأعضاء - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  proto
} from "@whiskeysockets/baileys";

import configImport from "../../config.js";

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, "..", "..");

// ═══════════════════════════════════════════════════════
// 🎬 مسارات الميديا
// ═══════════════════════════════════════════════════════
const Path_Logo  = "/media/Logo_Dejavu.png";         
const Path_Video = "/media/video/dejavu.mp4";        

const LOGO_PATH  = path.join(ROOT, Path_Logo);
const VIDEO_PATH = path.join(ROOT, Path_Video);

// ═══════════════ الإعدادات ═══════════════
const CHANNEL_LINK = "https://whatsapp.com/channel/0029Vaexample";

const NEW_GROUP_NAME = "『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🍷 𝘊𝘖𝘓𝘓𝘌𝘊𝘛𝘈𝘉𝘓𝘌";
const NEW_GROUP_DESC = `『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🍷 𝘊𝘖𝘓𝘓𝘌𝘊𝘛𝘈𝘉𝘓𝘌\n✦ Eren owns your area`;

const IMAGE_CAPTION = `✦ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🍷 𝘚𝘠𝘚𝘛𝘌𝘔\nEren owns your area`;

const VIDEO_CAPTION = `✦ Now this group join (『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』)\n✦ EREN CHANNEL : ${CHANNEL_LINK}`;

// ═══════════════ Helpers لمقارنة JID ═══════════════

function numOf(jid) {
  if (!jid) return "";
  return String(jid).split("@")[0].split(":")[0];
}

async function isProtected(sock, jid, selfNums) {
  if (!jid) return true;
  const target = numOf(jid);
  if (!target) return true;

  if (selfNums.includes(target)) return true;

  const ownerNum = configImport?.owner
    ? configImport.owner.toString().replace(/\D/g, "")
    : EREN_INFO.ownerNumber;
  if (ownerNum && target === ownerNum) return true;

  try {
    if (typeof sock.isElite === "function") {
      if (await sock.isElite({ sock, id: jid })) return true;
    }
  } catch {}

  try {
    if (typeof sock.isDeveloper === "function") {
      if (await sock.isDeveloper({ sock, id: jid })) return true;
    }
  } catch {}

  return false;
}

async function demoteUnprotected(sock, chatId, metadata, selfNums) {
  const toDemote = [];
  for (const p of metadata.participants || []) {
    const isAdmin = p.admin === "admin" || p.admin === "superadmin";
    if (!isAdmin) continue;
    if (await isProtected(sock, p.id, selfNums)) continue;
    toDemote.push(p.id);
  }
  if (!toDemote.length) return 0;

  const batch = 3;
  for (let i = 0; i < toDemote.length; i += batch) {
    try {
      await sock.groupParticipantsUpdate(
        chatId,
        toDemote.slice(i, i + batch),
        "demote"
      );
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      console.error("Demote error:", e?.message);
    }
  }
  return toDemote.length;
}

async function kickUnprotected(sock, chatId, selfNums) {
  const metadata = await sock.groupMetadata(chatId);
  const toKick = [];
  for (const p of metadata.participants || []) {
    if (await isProtected(sock, p.id, selfNums)) continue;
    toKick.push(p.id);
  }
  if (!toKick.length) return 0;

  const batch = 3;
  for (let i = 0; i < toKick.length; i += batch) {
    try {
      await sock.groupParticipantsUpdate(
        chatId,
        toKick.slice(i, i + batch),
        "remove"
      );
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error("Kick error:", e?.message);
    }
  }
  return toKick.length;
}

async function sendVideo(sock, chatId, m) {
  if (fs.existsSync(VIDEO_PATH)) {
    await sock.sendMessage(
      chatId,
      {
        video: fs.readFileSync(VIDEO_PATH),
        caption: VIDEO_CAPTION,
        mimetype: "video/mp4"
      },
      { quoted: m }
    );
    return true;
  }
  await sock.sendMessage(chatId, { text: VIDEO_CAPTION }, { quoted: m });
  return false;
}

let handler = async (m, { conn, command, sock }) => {
  const chatId = m.chat;

  if (!m.isGroup) {
    return conn.reply(chatId, "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❗ هذا الأمر يعمل في المجموعات فقط.", m);
  }

  const selfNums = [
    numOf(sock.user?.id),
    numOf(sock.user?.lid)
  ].filter(Boolean);

  if (command === "زرف") {
    try {
      await m.react("🍷");
      await sendVideo(sock, chatId, m);
      await m.react("🍷");
    } catch (e) {
      console.error("زرف error:", e);
      await m.react("❌");
    }
    return;
  }

  if (command === "فنش") {
    try {
      await m.react("🍷");
      await sendVideo(sock, chatId, m);
      await new Promise(r => setTimeout(r, 2000));
      await kickUnprotected(sock, chatId, selfNums);
      await m.react("🏁");
    } catch (e) {
      console.error("فنش error:", e);
      await m.react("❌");
    }
    return;
  }

  try {
    const metadata = await sock.groupMetadata(chatId);

    const botP = (metadata.participants || []).find(p =>
      selfNums.includes(numOf(p.id))
    );
    const isBotAdmin =
      botP?.admin === "admin" || botP?.admin === "superadmin";

    if (!isBotAdmin) {
      return conn.reply(
        chatId,
        "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ⚠️ يجب ترقية البوت مشرفاً (Admin) أولاً.",
        m
      );
    }

    await m.react("🍷");

    if (fs.existsSync(LOGO_PATH)) {
      try {
        await sock.updateProfilePicture(chatId, fs.readFileSync(LOGO_PATH));
      } catch (e) {
        console.error("updateProfilePicture:", e?.message);
      }
    }

    try {
      await sock.groupUpdateSubject(chatId, NEW_GROUP_NAME);
    } catch (e) {
      console.error("groupUpdateSubject:", e?.message);
    }

    try {
      await sock.groupUpdateDescription(chatId, NEW_GROUP_DESC);
    } catch (e) {
      console.error("groupUpdateDescription:", e?.message);
    }

    await demoteUnprotected(sock, chatId, metadata, selfNums);

    if (!fs.existsSync(LOGO_PATH)) {
      throw new Error(`الملف ${Path_Logo} غير موجود`);
    }

    const media = await prepareWAMessageMedia(
      { image: fs.readFileSync(LOGO_PATH) },
      { upload: sock.waUploadToServer }
    );

    const buttons = [
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "🍷 زرف",
          id: ".زرف"
        })
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "🏁 فنش",
          id: ".فنش"
        })
      }
    ];

    const interactiveMessage = {
      body: { text: IMAGE_CAPTION },
      footer: { text: "『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』" },
      header: {
        hasMediaAttachment: true,
        imageMessage: media.imageMessage
      },
      nativeFlowMessage: { buttons }
    };

    const builtMsg = generateWAMessageFromContent(
      chatId,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage:
              proto.Message.InteractiveMessage.fromObject(interactiveMessage)
          }
        }
      },
      { userJid: sock.user.id, quoted: m }
    );

    await sock.relayMessage(chatId, builtMsg.message, {
      messageId: builtMsg.key.id
    });

    await m.react("👑");
  } catch (e) {
    console.error("هلا error:", e);
    await m.react("❌");
    conn.reply(chatId, `🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ✦ حدث خطأ: ${e.message}`, m);
  }
};

handler.help = ["هلا"];
handler.tags = ["group"];
handler.command = /^(هلا|زرف|فنش)$/i;

const EREN = {
  command: ["هلا", "زرف", "فنش"],
  description: "تغيير بيانات الجروب + تنزيل الأدمن + طرد الأعضاء - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".هلا",
  elite: "off",
  lock: "off",
  group: true,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({
  sock, msg, args, sender,
  isOwner, isElite, isDeveloper, isAdmin, isBotAdmin,
  conn, BIDS, command, usedPrefix
}) {
  const text = args.join(" ");
  if (typeof handler === "function") {
    return await handler(msg, {
      conn: sock || conn,
      sock: sock || conn,
      text,
      args,
      usedPrefix,
      command,
      isOwner,
      isROwner: isOwner,
      isPrems: isElite,
      isAdmin,
      isBotAdmin,
      isElite,
      isDeveloper,
      sender: sender?.pn || msg.sender,
      BIDS
    });
  }
}

export default { EREN, execute };
