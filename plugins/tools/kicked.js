//@Eren/changes Customized for Eren framework
//@Eren/note فحص وكشف الأعضاء المزروفين المتواجدين في المجموعة مع الهوية والأرقام المعتمدة

// plugins/tools/kicked.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - فحص الأعضاء المزروفين 👁‍🗨

import { getUniqueKicked } from '../../lib/data.js';

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const EREN = {
    command: "مزروفين",
    description: "فحص وكشف الأعضاء المزروفين المتواجدين في المجموعة مع تواريخ رصدهم - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
    elite: "off",
    group: true,   
    prv: false,
    lock: "off",
    ownerNumber: EREN_INFO.ownerNumber,
    botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg }) {
    const chatId = msg.key.remoteJid;

    let groupMetadata;
    try {
        groupMetadata = await sock.groupMetadata(chatId);
    } catch (e) {
        return await sock.sendMessage(chatId, { text: "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ *فشل جلب بيانات المجموعة، تحقق من صلاحيات المشرف للبووت*" }, { quoted: msg });
    }

    const kickedMap = getUniqueKicked(); 
    
    if (kickedMap.size === 0) {
        return await sock.sendMessage(chatId, { text: "🍷 *لسه 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 ما انزرف بيه* 💤\n🔄 *سيبدأ الرصد من الآن*" }, { quoted: msg });
    }

    const participants = groupMetadata.participants;
    const foundList = []; 

    for (const participant of participants) {
        const userJid = participant.id; 
        const userNumber = userJid.split('@')[0];
        
        const searchKey = userNumber + '@lid';

        if (kickedMap.has(searchKey)) {
            const timestamp = kickedMap.get(searchKey);
            
            const dateObj = new Date(timestamp);
            const dateStr = dateObj.toLocaleDateString('en-GB'); 
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

            foundList.push({
                jid: userJid,
                formattedDate: `${dateStr} - ${timeStr}`
            });
        }
    }

    if (foundList.length > 0) {
        let txt = `👁‍🗨 *عدد مزروفين 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 :*\n\n`;
        txt += `🗂 *العدد المرصود :* ${foundList.length}\n`;
        txt += `➖`.repeat(8);
        
        const mentions = [];

        foundList.forEach((item, index) => {
            txt += `\n${index + 1}. @${item.jid.split('@')[0]}`;
            txt += `\n   └ 🗓️ ${item.formattedDate}`; 
            mentions.push(item.jid);
        });

        txt += `\n\n *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🍷*`;

        await sock.sendMessage(chatId, { 
            text: txt, 
            mentions: mentions 
        }, { quoted: msg });

    } else {
        await sock.sendMessage(chatId, { 
            text: "🍷 *لسه ما في ولا زرفه* 🔍" 
        }, { quoted: msg });
    }
}

export default { EREN, execute };
