//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/anti-link.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - نظام منع الروابط 🔗

import { theme } from '../../lib/theme.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 أمر التفعيل والتعطيل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let handler = async (m, { conn, text, isAdmin, isOwner }) => {

  // التحقق من المجموعة
  if (!m.isGroup) {
    return conn.reply(m.chat, `> ${theme.divider}
> 
> 🍷 *خـطـأ*
> 🍷 *هذا الأمر يعمل فقط في المجموعات - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*
> 
> ${theme.endDivider}`, m);
  }

  // التحقق من الصلاحيات
  if (!isAdmin && !isOwner) {
    return conn.reply(m.chat, `> ${theme.divider}
> 
> 🍷 *خـطـأ*
> 🍷 *هذا الأمر مخصص للمشرفين فقط*
> 
> ${theme.endDivider}`, m);
  }

  // تهيئة قاعدة البيانات لو مش موجودة
  if (!global.db || !global.db.data) {
    global.db = { data: { chats: {} } };
  }
  if (!global.db.data.chats) global.db.data.chats = {};
  if (!global.db.data.chats[m.chat]) {
    global.db.data.chats[m.chat] = { 
      antiLink: false,
      warnings: {}
    };
  }

  let chat = global.db.data.chats[m.chat];

  // عرض الحالة الحالية
  if (!text) {
    const currentStatus = chat.antiLink ? '🟢 مُفعل' : '🔴 مُعطل';
    return conn.reply(m.chat, `> ${theme.divider}
> 
> 🍷 *نـظـام مـنـع الـروبـط - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*
> 
> ${theme.smallDivider}
> 
> 🍷 *الـحـالـة:* ${currentStatus}
> 🍷 *الـتـحـذيـرات:* 3 ثم طرد
> 
> ${theme.smallDivider}
> 
> 🍷 *الاسـتـخـدام:* .منع_الروابط تفعيل
> 🍷 *.منع_الروابط تعطيل*
> 
> ${theme.endDivider}`, m);
  }

  // تفعيل النظام
  if (text === "تفعيل") {
    chat.antiLink = true;
    return conn.reply(m.chat, `> ${theme.divider}
> 
> 🍷 *تـم الـتـفـعـيـل*
> 
> ${theme.smallDivider}
> 
> 🍷 *🔗 نظام منع الروابط - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*
> 🍷 *الـحـالـة:* 🟢 مُفعلة
> 🍷 *الـتـحـذيـرات:* 3 مخالفات ثم الطرد
> 
> ${theme.endDivider}`, m);
  }

  // تعطيل النظام
  if (text === "تعطيل") {
    chat.antiLink = false;
    return conn.reply(m.chat, `> ${theme.divider}
> 
> 🍷 *تـم الـتـعـطـيـل*
> 
> ${theme.smallDivider}
> 
> 🍷 *تم إيقاف نظام منع الروابط*
> 🍷 *الـحـالـة:* 🔴 مُعطلة
> 
> ${theme.endDivider}`, m);
  }

  return conn.reply(m.chat, `> ${theme.divider}
> 
> 🍷 *خـطـأ*
> 🍷 *استخدم: تفعيل أو تعطيل*
> 
> ${theme.endDivider}`, m);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 نظام التحذير والطرد التلقائي (بيتشغل قبل أي رسالة)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

handler.before = async function (m, { conn, isBotAdmin, isAdmin }) {

  // التأكد أن الرسالة في مجموعة
  if (!m.isGroup) return;
  
  // التأكد أن فيه نص
  if (!m.text) return;

  // تهيئة قاعدة البيانات
  if (!global.db || !global.db.data) {
    global.db = { data: { chats: {} } };
  }
  if (!global.db.data.chats) global.db.data.chats = {};
  if (!global.db.data.chats[m.chat]) {
    global.db.data.chats[m.chat] = { 
      antiLink: false,
      warnings: {}
    };
  }

  let chat = global.db.data.chats[m.chat];
  
  // التأكد أن النظام مفعل
  if (!chat.antiLink) return;

  // التأكد أن البوت أدمن عشان يقدر يحذف ويطرد
  if (!isBotAdmin) return;

  // عدم تطبيق النظام على المشرفين
  if (isAdmin) return;

  // التحقق من وجود رابط
  const linkRegex = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|t\.me|telegram\.me|\.com|\.net|\.org)/i;

  if (linkRegex.test(m.text)) {

    // تهيئة سجل التحذيرات للمستخدم
    if (!chat.warnings) chat.warnings = {};
    if (!chat.warnings[m.sender]) {
      chat.warnings[m.sender] = 0;
    }

    chat.warnings[m.sender]++;

    // حذف الرسالة المخالفة
    try {
      await conn.sendMessage(m.chat, {
        delete: {
          remoteJid: m.chat,
          fromMe: false,
          id: m.key.id,
          participant: m.sender
        }
      });
    } catch (err) {
      console.error("Error in execution:", err);
    }

    // إذا وصل 3 تحذيرات → طرد
    if (chat.warnings[m.sender] >= 3) {

      try {
        await conn.groupParticipantsUpdate(m.chat, [m.sender], "remove");
        
        // حذف سجل التحذيرات بعد الطرد
        delete chat.warnings[m.sender];

        return await conn.reply(m.chat, `> ${theme.divider}
> 
> 🍷 *🚫 تـم طـرد الـعـضـو - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*
> 
> ${theme.smallDivider}
> 
> 🍷 *السبب:* تكرار إرسال الروابط (3 مخالفات)
> 
> ${theme.endDivider}`, m);
        
      } catch (err) {
        console.error("Error in execution:", err);
        return await conn.reply(m.chat, `> ${theme.divider}
> 
> 🍷 *خـطـأ*
> 🍷 *فشل طرد العضو، تأكد من صلاحيات البوت*
> 
> ${theme.endDivider}`, m);
      }
    }

    // إرسال تحذير عادي
    const remainingWarnings = 3 - chat.warnings[m.sender];
    return await conn.reply(m.chat, `> ${theme.divider}
> 
> 🍷 *⚠️ تـحـذيـر مـن إرسـال الـروبـط - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*
> 
> ${theme.smallDivider}
> 
> 🍷 *الـمـخـالـفـة:* ${chat.warnings[m.sender]}/3
> 🍷 *الـتـحـذيـرات الـمـتـبـقـيـة:* ${remainingWarnings}
> 
> ${theme.smallDivider}
> 
> 🍷 *يـرجى عـدم إرسـال الـروبـط مـرة أخـرى* 🍷
> 
> ${theme.endDivider}`, m);
  }
};

handler.help = ['منع_الروابط <تفعيل/تعطيل>'];
handler.tags = ['group'];
handler.command = /^منع_الروابط$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;


const EREN = {
  command: ["منع_الروابط","antilink"],
  description: "منع نشر روابط المجموعات وطرد المخالفين - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".منع_الروابط",
  elite: 'off',
  lock: "off",
  group: true,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "منع_الروابط";
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
