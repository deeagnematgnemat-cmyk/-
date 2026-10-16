//@Eren/changes Customized for Eren framework
//@Eren/note Uses standard Baileys sendMessage with mentions to hidetag all participants

const EREN = {
  command: ["مخفي", "hidetag", "منشن_مخفي"],
  description: "منشن جماعي مخفي لأعضاء المجموعة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".مخفي [نص اختياري]",
  elite: 'off',
  lock: "off",
  group: true,
  prv: false,
};

async function execute({ sock, msg, args, participants }) {
  const chatId = msg.key.remoteJid;
  const text = args.join(' ') || '\u200e'; // invisible char as fallback

  const mentions = (participants || []).map(p => p.id);

  try {
    await sock.sendMessage(chatId, {
      text: `『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』\n${text}`,
      mentions,
    }, { quoted: msg });
  } catch (err) {
    console.error("Error in hidetag:", err);
    await sock.sendMessage(chatId, { text: "❌ فشل المنشن المخفي." }, { quoted: msg });
  }
}

export default { EREN, AIZEN: EREN, execute };
