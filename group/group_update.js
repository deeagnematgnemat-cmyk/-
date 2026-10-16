//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/detect.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - كشف تغييرات المجموعة 🔍

import { WAMessageStubType } from '@whiskeysockets/baileys'

export async function before(m, { conn }) {
  if (!m.isGroup || !m.messageStubType) return

  let chat = global.db.data.chats[m.chat]
  if (!chat?.detect) return

  const senderJid = m.sender
  const senderId = senderJid.split('@')[0]
  const usuario = `@${senderId}`
  const pushName = m.pushName || 'User'

  // التوثيق
  const fk = {
    key: {
      participant: senderJid,
      remoteJid: 'status@broadcast'
    },
    message: {
      contactMessage: {
        displayName: '『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』',
        vcard: `BEGIN:VCARD
VERSION:3.0
FN:${pushName}
TEL;waid=${senderId}:${senderId}
END:VCARD`
      }
    }
  }

  let nombre = `╭━━ 📝 *تـغـيـر اسـم الـمـجـمـوعـة* ━━⃝🍷
│
│ 👤 *بواسطة:* ${usuario}
│ 🆕 *الاسم الجديد:* ${m.messageStubParameters?.[0] || '-'}
│
╰━━━━━━━━━━━━━⃝🍷`

  let foto = `╭━━ 🖼️ *تـغـيـر صـورة الـمـجـمـوعـة* ━━⃝🍷
│
│ 👤 *بواسطة:* ${usuario}
│
╰━━━━━━━━━━━━━⃝🍷`

  let edit = `╭━━ ⚙️ *تـغـيـر إعـدادات الـمـجـمـوعـة* ━━⃝🍷
│
│ 👤 *بواسطة:* ${usuario}
│
╰━━━━━━━━━━━━━⃝🍷`

  let status = `╭━━ 🔒 *تـغـيـر وضـع الـمـجـمـوعـة* ━━⃝🍷
│
│ 👤 *بواسطة:* ${usuario}
│
╰━━━━━━━━━━━━━⃝🍷`

  let admingp = `╭━━ 👑 *تـرقـيـة عـضـو* ━━⃝🍷
│
│ 👤 *العضو:* @${m.messageStubParameters?.[0]?.split('@')[0]}
│ 👑 *بواسطة:* ${usuario}
│
╰━━━━━━━━━━━━━⃝🍷`

  let noadmingp = `╭━━ 📉 *إعـفـاء عـضـو* ━━⃝🍷
│
│ 👤 *العضو:* @${m.messageStubParameters?.[0]?.split('@')[0]}
│ 👑 *بواسطة:* ${usuario}
│
╰━━━━━━━━━━━━━⃝🍷`

  let text = null
  let mentions = [senderJid]

  switch (m.messageStubType) {
    case WAMessageStubType.GROUP_CHANGE_SUBJECT:
      text = nombre
      break
    case WAMessageStubType.GROUP_CHANGE_ICON:
      text = foto
      break
    case WAMessageStubType.GROUP_CHANGE_SETTINGS:
      text = edit
      break
    case WAMessageStubType.GROUP_CHANGE_ANNOUNCE:
      text = status
      break
    case WAMessageStubType.GROUP_PARTICIPANT_PROMOTE:
      text = admingp
      mentions.push(m.messageStubParameters[0])
      break
    case WAMessageStubType.GROUP_PARTICIPANT_DEMOTE:
      text = noadmingp
      mentions.push(m.messageStubParameters[0])
      break
    default:
      return
  }

  await conn.sendMessage(
    m.chat,
    { text, mentions },
    { quoted: fk }
  )
}

const EREN = {
  command: ["تحديث_المجموعه","group_update"],
  description: "تحديث بيانات المجموعة وحمايتها - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".تحديث_المجموعه",
  elite: 'off',
  lock: "off",
  group: true,
  prv: false,
};

async function execute({ sock, msg }) {
  const chatId = msg.key.remoteJid;
  if (!chatId?.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❗ هذا الأمر يعمل في المجموعات فقط.' }, { quoted: msg });
  }

  if (!global.db.data.chats[chatId]) {
    global.db.data.chats[chatId] = { isBanned: false, welcome: false, antilink: false };
  }
  const chat = global.db.data.chats[chatId];
  chat.detect = !chat.detect;

  const status = chat.detect ? 'مفعّل ✅' : 'معطّل ❌';
  return sock.sendMessage(chatId, {
    text: `🔍 *كشف تغييرات المجموعة (『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』):* ${status}`
  }, { quoted: msg });
}

export default { EREN, AIZEN: EREN, execute };
