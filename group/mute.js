//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/mute.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - كتم أو فك كتم عضو (بالرد فقط) 🔇

import fetch from 'node-fetch';
import { theme } from '../../lib/theme.js';

let handler = async (m, { conn, command, isAdmin }) => {

    if (!m.isGroup) return;
    
    if (!isAdmin) {
        return m.reply(theme.build([
            { type: 'error', text: '⚠️ فقط المشرفين يمكنهم تنفيذ هذا الأمر - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' }
        ]));
    }

    // ⭐ فقط الرد على الرسالة (بدون منشن)
    let targetJid = null;
    
    if (m.quoted && m.quoted.sender) {
        targetJid = m.quoted.sender;
    } else {
        await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } });
        return m.reply(theme.build([
            { type: 'title', text: command === 'كتم' ? '🔇 أمر الكتم - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' : '🔊 أمر فك الكتم - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
            { type: 'spacer' },
            { type: 'warning', text: '⚠️ قم بالرد على رسالة العضو أولاً' },
            { type: 'info', label: 'لكتم عضو', value: '• رد على رسالة العضو\n• ثم اكتب .كتم' },
            { type: 'info', label: 'لفك كتم عضو', value: '• رد على رسالة العضو\n• ثم اكتب .فك_الكتم' }
        ]));
    }

    // تنظيف الـ JID
    targetJid = targetJid.split('@')[0] + '@s.whatsapp.net';

    // حماية البوت
    if (targetJid === conn.user.id) {
        return m.reply(theme.build([
            { type: 'error', text: '❌ لا يمكنك تنفيذ الأمر على البوت' }
        ]));
    }

    // حماية المطورين
    const owners = global.owner.map(v => v[0] + '@s.whatsapp.net');
    if (owners.includes(targetJid)) {
        return m.reply(theme.build([
            { type: 'error', text: '👑 لا يمكن تنفيذ الأمر على مطور البوت' }
        ]));
    }

    // جلب معلومات القروب
    const groupMetadata = await conn.groupMetadata(m.chat);
    const groupOwner = groupMetadata.owner || m.chat.split('-')[0] + "@s.whatsapp.net";

    if (targetJid === groupOwner) {
        return m.reply(theme.build([
            { type: 'error', text: '❌ لا يمكنك تنفيذ الأمر على صاحب المجموعة' }
        ]));
    }

    // التأكد من وجود قاعدة البيانات
    if (!global.db.data.users) global.db.data.users = {};
    if (!global.db.data.users[targetJid]) {
        global.db.data.users[targetJid] = { muto: false };
    }

    let userData = global.db.data.users[targetJid];
    let targetName = targetJid.split('@')[0];
    
    try {
        const name = await conn.getName(targetJid);
        if (name) targetName = name;
    } catch(e) {}

    // ===== كتم =====
    if (command === "كتم") {
        if (userData.muto === true) {
            return m.reply(theme.build([
                { type: 'warning', text: '⚠️ هذا العضو مكتوم بالفعل' }
            ]));
        }
        
        userData.muto = true;
        
        // حفظ في قاعدة البيانات
        if (global.db.writeData) {
            await global.db.writeData('users', targetJid, userData).catch(() => {});
        }
        
        await conn.sendMessage(m.chat, { react: { text: '🔇', key: m.key } });
        
        const successMsg = theme.build([
            { type: 'title', text: '🔇 تم كتم العضو - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
            { type: 'spacer' },
            { type: 'info', label: '👤 العضو', value: targetName },
            { type: 'line', text: 'تم كتم العضو بنجاح' }
        ]);
        
        await conn.sendMessage(m.chat, { text: successMsg, mentions: [targetJid] }, { quoted: m });
    }

    // ===== فك الكتم =====
    else if (command === "فك_الكتم") {
        if (userData.muto === false) {
            return m.reply(theme.build([
                { type: 'warning', text: '⚠️ هذا العضو غير مكتوم' }
            ]));
        }
        
        userData.muto = false;
        
        // حفظ في قاعدة البيانات
        if (global.db.writeData) {
            await global.db.writeData('users', targetJid, userData).catch(() => {});
        }
        
        await conn.sendMessage(m.chat, { react: { text: '🔊', key: m.key } });
        
        const successMsg = theme.build([
            { type: 'title', text: '🔊 تم فك كتم العضو - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
            { type: 'spacer' },
            { type: 'info', label: '👤 العضو', value: targetName },
            { type: 'line', text: 'تم فك كتم العضو بنجاح' }
        ]);
        
        await conn.sendMessage(m.chat, { text: successMsg, mentions: [targetJid] }, { quoted: m });
    }
};

// معالج حذف الرسائل للمكتومين
handler.all = async function (m) {
    if (!m.isGroup || !global.db.data.users) return;
    
    // التحقق من وجود المستخدم
    if (!global.db.data.users[m.sender]) return;
    
    let user = global.db.data.users[m.sender];
    if (!user.muto) return;

    // استثناء المشرفين من الكتم
    try {
        const groupMetadata = await this.groupMetadata(m.chat);
        const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        if (admins.includes(m.sender)) return;
    } catch(e) {}

    // حذف رسالة المكتوم
    await this.sendMessage(m.chat, {
        delete: {
            remoteJid: m.chat,
            fromMe: false,
            id: m.key.id,
            participant: m.sender
        }
    }).catch(() => {});
};

handler.help = ['كتم', 'فك_الكتم'];
handler.command = /^(كتم|فك_الكتم)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;


const EREN = {
  command: ["كتم","فك_الكتم","mute","unmute"],
  description: "كتم وفك كتم الأعضاء في المجموعة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".كتم",
  elite: 'off',
  lock: "off",
  group: true,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "كتم";
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
