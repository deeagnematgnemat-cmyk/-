//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// commands/getstickerhash.js
import crypto from 'crypto';

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

let handler = async (m, { conn }) => {
    if (!m.quoted || !m.quoted.mimetype?.includes('webp')) {
        return m.reply('🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ قم بالرد على ملصق (استيكر)');
    }
    
    let buffer = await m.quoted.download();
    let hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    m.reply(`🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n\n*بصمة الاستيكر:*\n\`\`\`${hash}\`\`\``);
};

handler.command = ['بصمة', 'stickerhash'];

const EREN = {
  command: ["بصمة","بصمه","stickerhash"],
  description: "استخراج هاش وبصمة الملصق SHA256 - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".بصمة (بالرد على ملصق)",
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
  const command = "بصمة";
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

export default { EREN, execute };
