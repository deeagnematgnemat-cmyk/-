//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

export const EREN = {
  command: "خفض",
  description: "إزالة الإشراف من عضو محدد (حصري للنخبة) - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  elite: "on",
  group: true,
  prv: false,
  lock: "off"
};

export default {
  EREN,
  AIZEN: EREN,
  async execute({ sock, msg, args, BIDS, sender }) {
    const isElite = await sock.isElite({ sock, id: sender.pn });

    const targetMembers = (await sock.replyedJid(msg)) ||
      (await sock.mentionnedJids(msg));

    if (!targetMembers && !args[0]) return; 

    if (sender.pn === BIDS.pn || isElite) {
      const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
      const participants = groupMetadata.participants;

      let demotedMembers = [];
      let notAdmins = [];

      const targets = targetMembers || [sender.pn];

      for (const member of targets) {
        const isAdmin = participants.find((p) => p.id === member)?.admin;

        if (isAdmin === 'admin' || isAdmin === 'superadmin') {
          demotedMembers.push(member);
        } else {
          notAdmins.push(member);
        }
      }

      if (demotedMembers.length > 0) {
        try {
          await sock.groupParticipantsUpdate(
            msg.key.remoteJid,
            demotedMembers,
            "demote"
          );
        } catch (e) {
          const errorText = String(e).toLowerCase();

          if (errorText.includes("not-authorized") || errorText.includes("forbidden") || (e.data === 403)) {
            return sock.sendMessage(
              msg.key.remoteJid, 
              { text: "🍷 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』: bot should be admin 𓂀" }, 
              { quoted: msg }
            );
          }
          console.error("Error demoting member:", e);
          return; 
        }
      }

      let text = "";
      let mentions = [sender.pn];

      if (demotedMembers.length > 0) {
        text += "🍷 *تمت إزالة الإشراف بنجاح - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:*\n";
        for (const member of demotedMembers) {
          text += `• العضو: @${member.split("@")[0]}\n`;
          mentions.push(member);
        }
      }

      if (notAdmins.length > 0) {
        if (text.length > 0) text += "\n";
        text += "🍷 *not admin:*\n";
        for (const member of notAdmins) {
          text += `• العضو: @${member.split("@")[0]} ليس مشرفاً بالفعل.\n`;
          mentions.push(member);
        }
      }

      if (text.length > 0) {
        text += `\n• بواسطة: @${sender.pn.split("@")[0]}`;
        return sock.sendMessage(msg.key.remoteJid, {
          text: text.trim(),
          mentions,
        });
      }
    }
  },
};

