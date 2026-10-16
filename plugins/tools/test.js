//@Eren/changes Customized for Eren framework
//@Eren/note اختبار رد بسيط مع الهوية والأرقام المعتمدة

import fs from "fs";
import path from "path";
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import { jidDecode } from "@whiskeysockets/baileys";

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const EREN = {
  command: "تست",
  description: "اختبار رد بسيط - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  elite: "off",
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

function decode(jid) {
  return (jidDecode(jid)?.user || jid.split("@")[0]) + "@s.whatsapp.net";
}

async function execute({sock, msg, args}) {
  const chatId = msg.key.remoteJid;
  const sender = decode(msg.key.participant || chatId);
  
  const textMain = "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 𝐼𝑆 𝑊𝑂𝑅𝐾𝐼𝑁𝐺 𝘗𝘌𝘙𝘍𝘌𝘊𝘛*"; 

  try {
    await sock.sendMessage(chatId, {
      text: textMain,
      mentions: [sender]
    }, { quoted: msg }); 
  } catch (error) {
    console.error("Error in execute:", error);
    await sock.sendMessage(chatId, { text: "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ 𝘌𝘙𝘖𝘙𝘙 𝘏𝘈𝘗𝘌𝘌𝘕𝘋" }, { quoted: msg });
  }
}

export default { EREN, execute };
