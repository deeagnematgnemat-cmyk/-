import fs from 'fs';
import { LOGO_FILE, IMAGE_FILE } from '../../lib/paths.js';
import config from '../../config.js';
import developerPro from '../../lib/developer.js';

//@Eren/changes Developers interactive carousel display
//@Eren/note Shows developers with custom cards and direct WhatsApp contact buttons

const EREN = {
  command: ["المطورين", "developers"],
  description: "عرض بطاقات مطوري البوت بشكل كاروسيل",
  usage: ".المطورين",
  elite: "off",
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg }) {
  const chatId = msg.key.remoteJid;
  const devs = developerPro.getDevelopers?.() || sock.getDevelopers?.() || [];
  const ownerNum = config.owner ? config.owner.toString().replace(/\D/g, "") : "962796163926";
  const allDevs = [...new Set([`${ownerNum}@s.whatsapp.net`, ...devs])];

  const defaultImg = fs.existsSync(LOGO_FILE)
    ? fs.readFileSync(LOGO_FILE)
    : (fs.existsSync(IMAGE_FILE) ? fs.readFileSync(IMAGE_FILE) : null);

  const cards = [];

  for (const devId of allDevs.slice(0, 10)) {
    const num = devId.split('@')[0];
    const waUrl = `https://wa.me/${num}`;
    cards.push({
      title: `👑 المطور: @${num}`,
      image: defaultImg,
      header: {
        title: `👑 المطور: @${num}`,
        ...(defaultImg ? { image: defaultImg } : {})
      },
      body: `🍷 مطور معتمد في عائلة 𝐸𝓇𝑒𝓃 🍷\nمسؤول عن برمجة وتطوير الميزات ودعم النظام.`,
      footer: `𝐸𝓇𝑒𝓃 🍷 𝘚𝘺𝘴𝘵𝘦𝘮`,
      buttons: [
        {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: 'تواصل عبر واتساب 💬',
            url: waUrl,
            merchant_url: waUrl
          })
        }
      ]
    });
  }

  if (cards.length === 1) {
    const channelLink = config.channelUrl || config.channelLink || "https://whatsapp.com/channel/0029Vaexample";
    cards.push({
      title: `🤖 نظام 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`,
      image: defaultImg,
      header: {
        title: `🤖 نظام 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`,
        ...(defaultImg ? { image: defaultImg } : {})
      },
      body: `🍷 النظام الرسمي لإدارة البوت وتحديثات السيرفر وحماية المجموعات.`,
      footer: `𝐸𝓇𝑒𝓃 🍷 𝘚𝘺𝘴𝘵𝘦𝘮`,
      buttons: [
        {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: 'قناة البوت الرسمية 📢',
            url: channelLink,
            merchant_url: channelLink
          })
        }
      ]
    });
  }

  try {
    await sock.sendMessage(chatId, {
      text: "👑 *قائمة مطوري 𝐸𝓇𝑒𝓃:*",
      cards,
      viewOnce: true
    }, { quoted: msg });
  } catch (err) {
    console.error("𝘌𝘳𝘳𝘰𝘳 𝘪𝘯 developers carousel:", err);
    let fallbackText = "👑 *قائمة مطوري البوت:*\n\n";
    for (const dev of allDevs) {
      const num = dev.split('@')[0];
      fallbackText += `• https://wa.me/${num}\n`;
    }
    await sock.sendMessage(chatId, { text: fallbackText }, { quoted: msg });
  }
}

export default { EREN, DEJAVU: EREN, AIZEN: EREN, execute };

