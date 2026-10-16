//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

import fs from 'fs';
import path from 'path';
import { IMAGE_FILE } from '../../lib/paths.js';

// تعريف رقم المطور ورقم حساب البوت الرسمي
const EREN_INFO = {
    ownerNumber: "رقم_المطور_هنا", // ضع رقم المطور هنا
    botNumber: "رقم_البوت_هنا"      // ضع رقم حساب البوت هنا
};

const EREN = {
  command: ["بوت"],
  description: "الرد التعريفي للبوت - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".بوت أو بوت",
  elite: "off",
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender }) {
  const chatId = msg.key.remoteJid;

  try {
    // Reaction indicating processing
    await sock.sendMessage(chatId, { react: { text: '🍷', key: msg.key } });

    const teks = `اسـمـي 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 يا قلبي وموجود فخدمتك 24/7`;
    const authorNum = EREN_INFO.ownerNumber || '201009579295';
    const watermark = '〔  『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』  〕';

    let imageContent = null;
    if (fs.existsSync(IMAGE_FILE)) {
      imageContent = fs.readFileSync(IMAGE_FILE);
    }

    await sock.sendMessage(chatId, {
      product: {
        ...(imageContent ? { productImage: imageContent } : {}),
        productId: authorNum,
        title: '*〔  『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』  〕*',
        description: 'Advanced whatsapp bot',
        currencyCode: 'USD',
        priceAmount1000: '999999999999999',
        retailerId: authorNum,
        productImageCount: 1,
      },
      businessOwnerJid: `${authorNum}@s.whatsapp.net`,
      caption: teks,
      footer: watermark,
      interactiveButtons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '📋 الـقـائـمـة',
            id: '.الاوامر'
          })
        }
      ],
      mentions: [sender.pn]
    }, { quoted: msg });

  } catch (err) {
    console.error("Error in bot command:", err);
    await sock.sendMessage(chatId, { text: "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* حصل خطأ أثناء إرسال معلومات البوت." }, { quoted: msg });
  }
}

export default { EREN, AIZEN: EREN, execute };
