//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/couplepp.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - صور كابلز (ولد + بنت) 💑👫

import fetch from "node-fetch";
import { theme } from '../../lib/theme.js';

// تعريف رقم المطور ورقم حساب البوت الرسمي
const EREN_INFO = {
    ownerNumber: "رقم_المطور_هنا", // ضع رقم المطور هنا
    botNumber: "رقم_البوت_هنا"      // ضع رقم حساب البوت هنا
};

let handler = async (m, { conn }) => {
  try {
    await conn.sendMessage(m.chat, { react: { text: '🍷', key: m.key } });

    // جلب قاعدة بيانات الصور من الرابط المعتمد
    let res = await fetch("https://raw.githubusercontent.com/KazukoGans/database/main/anime/ppcouple.json");
    let data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply(theme.build([
        { type: 'error', text: '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ لم يتم العثور على بيانات الكابلز' }
      ]));
    }

    // اختيار زوج عشوائي من الصور (ولد + بنت)
    let cita = data[Math.floor(Math.random() * data.length)];

    // إرسال صورة الولد
    await conn.sendMessage(m.chat, {
      image: { url: cita.cowo },
      caption: theme.build([
        { type: 'title', text: '👦 صورة الولد' },
        { type: 'line', text: '👫 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - كابلز' }
      ])
    }, { quoted: m });

    // إرسال صورة البنت
    await conn.sendMessage(m.chat, {
      image: { url: cita.cewe },
      caption: theme.build([
        { type: 'title', text: '👧 صورة البنت' },
        { type: 'line', text: '👫 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - كابلز' }
      ])
    }, { quoted: m });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (err) {
    console.error(err);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    m.reply(theme.build([
      { type: 'error', text: '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ حدث خطأ أثناء تحميل الصور' },
      { type: 'info', label: 'السبب', value: err.message || 'خطأ غير معروف' }
    ]));
  }
};

handler.help = ['كابيلز'];
handler.tags = ['images'];
handler.command = /^(كابيلز|couplepp|تطقيم)$/i;

const EREN = {
  command: ["كابلز","كابيلز","couplepp","تطقيم"],
  description: "صور تطقيم افتارات كابلز - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".كابلز",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "كابلز";
  if (typeof handler === 'function') {
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
      sender: sender?.pn || msg.sender,
      BIDS
    });
  }
}

export default { EREN, AIZEN: EREN, execute };
