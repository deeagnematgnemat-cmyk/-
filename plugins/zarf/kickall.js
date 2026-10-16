//@Eren/changes Customized for Eren framework
//@Eren/note طرد جميع الأعضاء (عدا النخبة) مع الهوية والأرقام المعتمدة

import { jidDecode } from "@whiskeysockets/baileys";
import { addKicked } from "../../lib/data.js"; 

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

export let zarfConfig = {
  reaction: {
    status: `on`,
    emoji: `🍷`
  },
  group: {
    status: `on`,
    descStatus: `on`,
    newSubject: `『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 مزروف`,
    newDescription: `Eren owns your area..\n\nما بقول لك مين إيرين، قرب وبتعرفه كويس..\n\nتبي تعرف كيف انزرفت..؟\nإجابتك بتنزل هنا قريب :\n\n𖠇 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』\n↬ t.me/eren\n\n------`
  },
  mention: {
    status: `on`,
    text: `𝐸𝓇𝑒𝓃`
  },
  finalMessage: {
    status: `on`,
    text: `Eren owns your area..\n\nما بقول لك مين إيرين، قرب وبتعرفه كويس..\n\nتبي تعرف كيف انزرفت..؟\nإجابتك بتنزل هنا قريب :\n\n𖠇 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』\n↬ t.me/eren`
  },
  media: {
    status: `off`,
    image: `image.jpeg`
  },
  audio: {
    status: `off`,
    file: `eren/sounds/AUDIO.mp3`
  },
  video: {
    status: `off`,
    file: `eren/data/zarf.mp4`
  }
};

export const EREN = {
    command: "طرد",
    description: "طرد جميع الأعضاء (عدا النخبة) وحسابهم - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
    elite: "on",      
    group: true,      
    prv: false,
    lock: "off",
    ownerNumber: EREN_INFO.ownerNumber,
    botNumber: EREN_INFO.botNumber
};

export async function execute({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const botJid = (jidDecode(sock.user.id)?.user || sock.user.id.split("@")[0]) + "@s.whatsapp.net";

    try {
        await sock.sendMessage(jid, { react: { text: zarfConfig.reaction.emoji, key: msg.key } });

        const metadata = await sock.groupMetadata(jid);
        const members = metadata.participants;

        const membersToRemove = [];

        for (const member of members) {
            if (member.id === botJid) continue;
            let isElite = false;
            try {
                isElite = await sock.isElite({ sock, id: member.id });
            } catch (e) {
                isElite = false;
            }
            if (!isElite) {
                membersToRemove.push(member.id);
            }
        }

        if (membersToRemove.length > 0) {
            try {
                await sock.groupParticipantsUpdate(jid, membersToRemove, "remove");
                addKicked(membersToRemove);
            } catch (kickError) {
                console.error("Failed to remove participants:", kickError);
                await sock.sendMessage(jid, { 
                    text: "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ فشل الطرد! لم يتم احتساب العدد." 
                }, { quoted: msg });
                return;
            }
        } else {
            await sock.sendMessage(jid, { text: "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ⚠️ لا يوجد أعضاء للطرد." }, { quoted: msg });
        }

    } catch (err) {
        console.error("Error in kick command:", err);
        await sock.sendMessage(jid, { text: "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ حدث خطأ عام." }, { quoted: msg });
    }
}

export default { EREN, execute };
