//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

import fs from 'fs';
import path from 'path';
import { DATA_DIR, MEDIA_DIR } from '../../lib/paths.js';

// plugins/azkar.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - نظام الأذكار اليومية التلقائية 🌹

const AZKAR_FILE = path.join(DATA_DIR, 'azkar.json');
const AZKAR_IMG_DIR = path.join(MEDIA_DIR, 'AZKAR_MEDIA', 'img');
const AZKAR_VID_DIR = path.join(MEDIA_DIR, 'AZKAR_MEDIA', 'video');

const EREN = {
  command: ["ازكار", "اذكار", "azkar"],
  description: "تشغيل أو إيقاف الأذكار اليومية التلقائية في المجموعة (1:00 ظهراً بتوقيت مصر) - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".ازكار on أو .ازكار off",
  elite: "off",
  lock: "off",
  group: true,
  prv: false,
};

function getAzkarConfig() {
  try {
    if (!fs.existsSync(AZKAR_FILE)) return {};
    return JSON.parse(fs.readFileSync(AZKAR_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveAzkarConfig(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(AZKAR_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error("Error saving azkar config:", e);
  }
}

function getRandomMedia() {
  const mediaPool = [];

  if (fs.existsSync(AZKAR_IMG_DIR)) {
    const imgs = fs.readdirSync(AZKAR_IMG_DIR)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .map(f => ({ type: 'image', path: path.join(AZKAR_IMG_DIR, f) }));
    mediaPool.push(...imgs);
  }

  if (fs.existsSync(AZKAR_VID_DIR)) {
    const vids = fs.readdirSync(AZKAR_VID_DIR)
      .filter(f => /\.(mp4|mkv|mov)$/i.test(f))
      .map(f => ({ type: 'video', path: path.join(AZKAR_VID_DIR, f) }));
    mediaPool.push(...vids);
  }

  if (mediaPool.length === 0) return null;
  return mediaPool[Math.floor(Math.random() * mediaPool.length)];
}

// Background scheduler singleton
let schedulerStarted = false;
let lastSentDay = "";

function startScheduler(sock) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(async () => {
    try {
      if (!sock?.groupFetchAllParticipating) return;

      const now = new Date();
      const cairoParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(now);

      const hour = parseInt(cairoParts.find(p => p.type === 'hour')?.value || "0", 10);
      const minute = parseInt(cairoParts.find(p => p.type === 'minute')?.value || "0", 10);
      const day = cairoParts.find(p => p.type === 'day')?.value || "";

      // Trigger at 13:00 (1:00 PM Cairo time)
      if (hour === 13 && minute === 0 && lastSentDay !== day) {
        lastSentDay = day;
        console.log(`[AZKAR] ⏱️ 1:00 PM Cairo reached. Broadcasting daily Azkar - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』...`);

        const azkarConfig = getAzkarConfig();
        const groups = await sock.groupFetchAllParticipating().catch(() => ({}));

        for (const [groupId, groupData] of Object.entries(groups)) {
          // Default is 'on' unless explicitly set to false
          if (azkarConfig[groupId] === false) continue;

          const randomItem = getRandomMedia();
          if (!randomItem) continue;

          const participantJids = (groupData.participants || []).map(p => p.id);
          const caption = `🌹 *أَلا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ*\n\n_أذكار 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 اليومية المباركة_ 🍷`;

          try {
            const buffer = fs.readFileSync(randomItem.path);
            if (randomItem.type === 'image') {
              await sock.sendMessage(groupId, {
                image: buffer,
                caption,
                mentions: participantJids
              });
            } else if (randomItem.type === 'video') {
              await sock.sendMessage(groupId, {
                video: buffer,
                caption,
                mentions: participantJids
              });
            }
          } catch (sendErr) {
            console.error(`[AZKAR] Failed to send to ${groupId}:`, sendErr.message);
          }
        }
      }
    } catch (err) {
      console.error("[AZKAR] Scheduler error:", err);
    }
  }, 30000); // Check every 30 seconds
}

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, isAdmin }) {
  const chatId = msg.key.remoteJid;

  // Initialize scheduler with live socket
  startScheduler(sock || global.conn);

  try {
    const metadata = await sock.groupMetadata(chatId).catch(() => null);
    const participantJids = (metadata?.participants || []).map(p => p.id);
    const participant = (metadata?.participants || []).find(p =>
      p.id === sender.pn || p.id === sender.lid || p.id?.split('@')[0] === sender.pn?.split('@')[0]
    );
    const isGroupAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin' || isAdmin;

    const sub = (args[0] || "").toLowerCase();
    const config = getAzkarConfig();

    if (sub === "on" || sub === "تشغيل") {
      if (!isGroupAdmin && !isOwner && !isElite && !isDeveloper) {
        return await sock.sendMessage(chatId, {
          text: "❌ عذراً، هذا الأمر مخصص لمشرفي المجموعة فقط."
        }, { quoted: msg });
      }
      config[chatId] = true;
      saveAzkarConfig(config);
      return await sock.sendMessage(chatId, {
        text: "✅ *تم تفعيل الأذكار اليومية بنجاح!*\n\nسيتم إرسال صورة أو فيديو أذكار يومياً في تمام الساعة 1:00 ظهراً بتوقيت مصر 🇪🇬 مع منشن مخفي للمجموعة عبر 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』."
      }, { quoted: msg });
    } else if (sub === "off" || sub === "ايقاف" || sub === "إيقاف" || sub === "تعطيل") {
      if (!isGroupAdmin && !isOwner && !isElite && !isDeveloper) {
        return await sock.sendMessage(chatId, {
          text: "❌ عذراً، هذا الأمر مخصص لمشرفي المجموعة فقط."
        }, { quoted: msg });
      }
      config[chatId] = false;
      saveAzkarConfig(config);
      return await sock.sendMessage(chatId, {
        text: "❌ *تم إيقاف الأذكار اليومية في هذه المجموعة.*"
      }, { quoted: msg });
    } else if (sub === "حاله" || sub === "حالة" || sub === "status") {
      const currentState = config[chatId] !== false ? "مُفَعَّل ✅" : "مُعَطَّل ❌";
      return await sock.sendMessage(chatId, {
        text: `📢 *حالة الأذكار اليومية في المجموعة:*\nالحالة الحالية: *${currentState}*\n\nللتحكم بالخدمة:\n• *.ازكار on* (لتشغيل الإرسال التلقائي)\n• *.ازكار off* (لإيقاف الإرسال التلقائي)`
      }, { quoted: msg });
    } else {
      // Default invocation (.ازكار): send a random zekr media with hidden mentions
      const randomItem = getRandomMedia();
      if (!randomItem) {
        return await sock.sendMessage(chatId, {
          text: "⚠️ لا توجد وسائط أذكار في /media/AZKAR_MEDIA حالياً."
        }, { quoted: msg });
      }

      const caption = `🌹 *أَلا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ*\n\n_أذكار 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 المباركة_ 🍷\n\n_للتحكم بالأذكار اليومية: .ازكار on / .ازكار off_`;
      const buffer = fs.readFileSync(randomItem.path);

      if (randomItem.type === 'image') {
        return await sock.sendMessage(chatId, {
          image: buffer,
          caption,
          mentions: participantJids
        }, { quoted: msg });
      } else if (randomItem.type === 'video') {
        return await sock.sendMessage(chatId, {
          video: buffer,
          caption,
          mentions: participantJids
        }, { quoted: msg });
      }
    }
  } catch (err) {
    console.error("Error in azkar command:", err);
    return await sock.sendMessage(chatId, { text: "❌ تعذر تنفيذ أمر الأذكار في هذه المجموعة." }, { quoted: msg });
  }
}

export default { EREN, AIZEN: EREN, execute };
