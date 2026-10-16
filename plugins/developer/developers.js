//@Eren/changes Developer management plugin for Eren bot system
//@Eren/note Mirroring elite plugin mechanics with dedicated developer database

const usageMessage =
  "𝕏 أمر غير معروف.\n\n" +
  "الأوامر المتاحة:\n" +
  "• .مطور اضف [منشن/رد/رقم]\n" +
  "• .مطور ازل [منشن/رد/رقم]\n" +
  "• .مطور عرض\n" +
  "• .مطور ضبط";

const EREN = {
  command: ["مطور", "developer", "devolper"],
  description: "إدارة قائمة المطورين",
  usage: ".مطور [اضف | ازل | عرض | ضبط] [منشن | رد | رقم]",
  developer: "on",
  group: false,
  prv: false,
  lock: "on",
};

async function execute({ sock, msg, args, BIDS, sender }) {
  const action = args[0];

  let ids = (await sock.replyedJid(msg)) || (await sock.mentionnedJids(msg));
  if ((!ids || ids.length === 0) && args[1]) {
    const number = args[1].replace(/[^0-9]/g, "");
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
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "يرجى عمل منشن، رد، أو كتابة الرقم بجانب الأمر." },
          { quoted: msg }
        );
      }
      const res_add = await sock.addDeveloper({ sock, ids });
      let mess_add = "🍷 *إضافة أعضاء المطورين*\n\n";
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
            mess_add += `• العضو @${user.id.split("@")[0]} هو مطور بالفعل.\n`;
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
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "يرجى عمل منشن، رد، أو كتابة الرقم بجانب الأمر." },
          { quoted: msg }
        );
      }
      const res_rm = await sock.rmDeveloper({ sock, ids });
      let mess_rm = "🍷 *إزالة أعضاء المطورين*\n\n";
      let mentions = [];
      if (res_rm.success && res_rm.success.length > 0) {
        mess_rm += "✔ *تمت الإزالة بنجاح:*\n";
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
            mess_rm += `• العضو @${user.id.split("@")[0]} ليس من المطورين أصلاً.\n`;
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
      const devs = sock.getDevelopers();
      if (!devs || devs.length === 0) {
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "لا يوجد أعضاء مطورين حالياً." },
          { quoted: msg }
        );
      }
      let text = "🍷 *قائمة المطورين:*\n\n";
      let mentions = [];
      for (const id of devs) {
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
      await sock.developerReset({ sock });
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: "✔ تم تصفير قائمة المطورين بنجاح." },
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

export default { EREN, DEJAVU: EREN, AIZEN: EREN, execute };
