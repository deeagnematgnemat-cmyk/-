//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

const usageMessage = 
      "𝕏 أمر غير معروف.\n\n" +
      "الأوامر المتاحة:\n" +
      "• .نخبة اضف [منشن/رد/رقم]\n" +
      "• .نخبة ازل [منشن/رد/رقم]\n" +
      "• .نخبة عرض\n" +
      "• .نخبة ضبط";

const EREN = {
  command: "نخبة",
  description: "إدارة النخبة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".نخبة [اضف | ازل | عرض] [منشن | رد | رقم]",
  elite: "on",
  group: false,
  prv: false,
  lock: "on",
};

async function execute({ sock, msg, args, BIDS, sender }) {
    const action = args[0];
    
    let ids = (await sock.replyedJid(msg)) || (await sock.mentionnedJids(msg));

    if ((!ids || ids.length === 0) && args[1]) {
        
        const number = args[1].replace(/[^0-9]/g, '');
        
        if (number.length > 5) {
            const tempJid = number + "@s.whatsapp.net";
            
            const check = await sock.onWhatsApp(tempJid);
            
            if (check && check[0]?.exists) {
                ids = [check[0].jid];
            } else {
                return sock.sendMessage(
                    msg.key.remoteJid,
                    { text: "𝕏 هذا الرقم غير مسجل في واتساب." },
                    { quoted: msg }
                );
            }
        }
    }

    if (!action) {
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: usageMessage },
        { quoted: msg }
      );
    }

    switch (action) {
      case "اضف": {
        if (!ids || ids.length === 0) {
            return sock.sendMessage(msg.key.remoteJid, { text: "يرجى عمل منشن، رد، أو كتابة الرقم بجانب الأمر." }, { quoted: msg });
        }
        const res_add = await sock.addElite({ sock, ids });
        let mess_add = "🍷 *إضافة أعضاء النخبة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n\n";
        let mentions = [];

        if (res_add.success && res_add.success.length > 0) {
          mess_add += "✔ *تمت الإضافة بنجاح:*\n";
          for (const user of res_add.success) {
            mess_add += `> @${user.id.split("@")[0]}\n`;
            mentions.push(user.id);
          }
        }
        
        if (res_add.fail && res_add.fail.length > 0) {
          if (res_add.success.length > 0) mess_add += "\n"; 
          mess_add += "⚠️ *تنبيه:*\n";
          for (const user of res_add.fail) {
            if (user.error === "exist_already") {
                mess_add += `• العضو @${user.id.split("@")[0]} هو نخبة بالفعل.\n`;
            } else {
                mess_add += `• فشل @${user.id.split("@")[0]}: ${user.error || "غير معروف"}\n`;
            }
            mentions.push(user.id);
          }
        }

        return sock.sendMessage(msg.key.remoteJid, {
          text: mess_add.trim(),
          mentions,
        });
      }

      case "ازل": {
        if (!ids || ids.length === 0) {
            return sock.sendMessage(msg.key.remoteJid, { text: "يرجى عمل منشن، رد، أو كتابة الرقم بجانب الأمر." }, { quoted: msg });
        }
        const res_rm = await sock.rmElite({ sock, ids });
        let mess_rm = "🍷 *إزالة أعضاء النخبة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n\n";
        let mentions = [];

        if (res_rm.success && res_rm.success.length > 0) {
          mess_rm += " ✔*تمت الإزالة بنجاح:*\n";
          for (const user of res_rm.success) {
            mess_rm += `> @${user.id.split("@")[0]}\n`;
            mentions.push(user.id);
          }
        }
        
        if (res_rm.fail && res_rm.fail.length > 0) {
          if (res_rm.success.length > 0) mess_rm += "\n";
          mess_rm += "⚠️ *تنبيه:*\n";
          for (const user of res_rm.fail) {
             if (user.error === "not_exist") {
                mess_rm += `• العضو @${user.id.split("@")[0]} ليس من النخبة أصلاً.\n`;
             } else {
                mess_rm += `• فشل @${user.id.split("@")[0]}: ${user.error || "غير معروف"}\n`;
             }
            mentions.push(user.id);
          }
        }

        return sock.sendMessage(msg.key.remoteJid, {
          text: mess_rm.trim(),
          mentions,
        });
      }

      case "عرض": {
        const elites = sock.getElites(); 
        if (!elites || elites.length === 0) {
          return sock.sendMessage(
            msg.key.remoteJid,
            { text: "لا يوجد أعضاء نخبة حالياً." },
            { quoted: msg }
          );
        }
        let text = "👑 *أعضاء النخبة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:*\n\n";
        let mentions = [];
        for (const id of elites) {
          text += `• @${id.split("@")[0]}\n`;
          mentions.push(id);
        }
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: text.trim(), mentions },
          { quoted: msg }
        );
      }

      case "ضبط": {
        await sock.eliteReset({ sock });
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "✔ تم تصفير قائمة النخبة بنجاح." },
          { quoted: msg }
        );
      }

      default: {
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: usageMessage },
          { quoted: msg }
        );
      }
    }
}

export default { EREN, AIZEN: EREN, execute };
