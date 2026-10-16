//@Eren/changes Customized for Eren framework
//@Eren/note جلب رقم المستخدم مع الهوية والأرقام المعتمدة

// plugins/tools/jid.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - جلب رقم المستخدم 🆔

const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const EREN = {
    command: "jid", 
    description: "جلب رقم المستخدم - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
    usage: ".رقم [منشن | رد | رقم]",
    elite: "off",
    group: false,
    prv: false,
    lock: "on",
    ownerNumber: EREN_INFO.ownerNumber,
    botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, BIDS, sender }) {
    const targetJid = sender.pn || sender;
    const number = targetJid.split("@")[0];

    return sock.sendMessage(msg.key.remoteJid, { 
        text: `🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n📱 الرقم: +${number}` 
    }, { quoted: msg });
}

export default { EREN, execute };
