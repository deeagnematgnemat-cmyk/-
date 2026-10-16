//@Eren/changes Customized for Eren framework
//@Eren/note عرض حالة البوت والسرعة والمدة مع الهوية والأرقام المعتمدة

import { jidDecode } from "@whiskeysockets/baileys";

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const EREN = {
    command: ["حالة", "ping", "speed"],
    description: "عرض حالة البوت والسرعة والمدة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
    elite: "off",
    group: false,
    prv: false,
    lock: "off",
    ownerNumber: EREN_INFO.ownerNumber,
    botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg }) {
    const m = msg; 

    try {
        const jid = m.key.remoteJid;
        
        const start = Date.now();
        const uptimeSeconds = process.uptime();
        const uptimeFormatted = new Date(uptimeSeconds * 1000).toISOString().substr(11, 8);
        
        const end = Date.now();
        const ping = end - start; 
        
        const statusMessage = `🍷 *حالة البوت 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:*
𓂀 *Speed:* ${ping}ms
⏱️ *Duration:* ${uptimeFormatted}
📱 *Developer:* +${EREN_INFO.ownerNumber}`;

        await sock.sendMessage(jid, { text: statusMessage }, { quoted: m });
        
    } catch (error) {
        console.error("❌ Error in ping plugin:", error);
        await sock.sendMessage(m.key.remoteJid, { text: "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ 𝘌𝘳𝘰𝘳𝘳 𝘩𝘢𝘱𝘱𝘦𝘯𝘦𝘥" }, { quoted: m });
    }
}

export default { EREN, execute };
