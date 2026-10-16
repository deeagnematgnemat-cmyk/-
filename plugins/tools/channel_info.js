//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

// تعريف رقم المطور ورقم حساب البوت الرسمي
const EREN_INFO = {
    ownerNumber: "رقم_المطور_هنا", // ضع رقم المطور هنا
    botNumber: "رقم_البوت_هنا"      // ضع رقم حساب البوت هنا
};

let handler = async (m, { text, conn }) => {
  if (!text) return m.reply('🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* الرجاء إدخال رابط القناة.');
  
  // الرابط الجديد المعتمد للقناة
  const defaultChannelLink = 'https://whatsapp.com/channel/0029Vb8jc2PFHWq9IwKDk50d';
  const targetLink = text.trim() || defaultChannelLink;

  if (!targetLink.includes('https://whatsapp.com/channel/')) return m.reply('🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* رابط غير صحيح.');

  let result = targetLink.split('https://whatsapp.com/channel/')[1];
  let channelId = result.split('/')[0];

  let res;
  try {
    res = await conn.newsletterMetadata('invite', channelId); 
  } catch (error) {
    console.error("Error in execution:", error); 
    return m.reply('🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* حدث خطأ أثناء جلب بيانات القناة. تأكد من صحة الرابط.');
  }

  let timestamp = new Date().getTime();
  let formattedTime = new Date(timestamp).toLocaleString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  let teks = `
╭━〔 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - معلومات القناة* 〕━⬣
┃ 🆔 *ID:* ${res.id}
┃ 🧣 *الاسم:* ${res.name}
┃ 🕓 *وقت جلب المعلومات:* ${formattedTime}
┃ 👤 *عدد المشتركين:* ${res.subscribers}
┃ 🚦 *الحالة:* ${res.state}
┃ ✅ *التحقق:* ${res.verification === 'VERIFIED' ? 'مُحققة' : 'غير مُحققة'}
╰━━━━━━〔〕━━━⬣
`.trim();

  await m.reply(teks);
};

handler.help = handler.command = ['قناه'];
handler.tags = ['tools'];

const EREN = {
  command: ["قناه","channel"],
  description: "معلومات وإحصائيات قنوات واتساب - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".قناه",
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
  const command = "قناه";
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
