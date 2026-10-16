//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// تعريف رقم المطور ورقم حساب البوت الرسمي
const EREN_INFO = {
    ownerNumber: "رقم_المطور_هنا", // ضع رقم المطور هنا
    botNumber: "رقم_البوت_هنا"      // ضع رقم حساب البوت هنا
};

const EREN = {
  command: ["شيك", "check", "فحص"],
  description: "فحص حالة تسجيل الرقم على واتساب والتحقق من صلاحيته - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".شيك [الرقم / رد / منشن]",
  elite: "off",
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender }) {
  const chatId = msg.key.remoteJid;

  let targetPhone = "";

  if (args[0]) {
    targetPhone = args[0].replace(/\D/g, "");
  } else {
    const replyJid = (await sock.replyedJid(msg))?.[0];
    const mentionJid = (await sock.mentionnedJids(msg))?.[0];
    const jid = replyJid || mentionJid || sender.pn;
    targetPhone = jid ? jid.replace(/\D/g, "") : "";
  }

  if (!targetPhone || targetPhone.length < 6) {
    return await sock.sendMessage(chatId, {
      text: "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:*\n⚠️ يرجى تحديد رقم صحيح للفحص، أو الرد على رسالة العضو.\nمثال: *.شيك 201009579295*"
    }, { quoted: msg });
  }

  await sock.sendMessage(chatId, { react: { text: "🍷", key: msg.key } });

  try {
    const result = typeof sock.verifyPhone === "function"
      ? await sock.verifyPhone(targetPhone)
      : null;

    if (!result) {
      // Fallback to sock.onWhatsApp
      const [onWa] = await sock.onWhatsApp(`${targetPhone}@s.whatsapp.net`);
      const isRegistered = !!onWa?.exists;
      return await sock.sendMessage(chatId, {
        text:
`╭────────『 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 』────────╮
│ 📱 الرقم : +${targetPhone}
│ 💬 مسجل في واتساب : ${isRegistered ? "نعم ✅" : "لا ❌"}
│ 🆔 المعرف : ${onWa?.jid || "غير متاح"}
╰────────────────────────────────────────╯`
      }, { quoted: msg });
    }

    const isRegistered = result.registered || result.exists;
    const methodsList = Array.isArray(result.methods) && result.methods.length > 0
      ? result.methods.join(", ")
      : "رمز SMS / اتصال";

    const responseText =
`╭────────『 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 』────────╮
│ 📱 الرقم : +${result.phone || targetPhone}
│ 💬 مسجل على واتساب : ${isRegistered ? "نعم ✅" : "لا ❌"}
│ 🌐 مفتاح الدولة (CC) : ${result.cc || "غير محدد"}
│ 🔐 طرق التحقق المتاحة : ${methodsList}
│ 🆔 المعرف الرسمي : ${result.jid || targetPhone + "@s.whatsapp.net"}
│ ⚡ الحالة : ${result.status || "نشط"}
╰────────────────────────────────────────╯

_فحص مؤكد بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🍷_`;

    await sock.sendMessage(chatId, {
      text: responseText,
      mentions: [`${targetPhone}@s.whatsapp.net`]
    }, { quoted: msg });

  } catch (err) {
    console.error("Error in verifyPhone:", err);
    await sock.sendMessage(chatId, {
      text: `🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:*\n❌ تعذر إتمام فحص الرقم: ${err.message}`
    }, { quoted: msg });
  }
}

export default { EREN, AIZEN: EREN, execute };
