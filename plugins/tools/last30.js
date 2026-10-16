//@Eren/changes Customized for Eren framework
//@Eren/note عرض آخر 30 رسالة مسجلة مع الهوية والأرقام المعتمدة

// plugins/owner/last30.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - عرض آخر 30 رسالة مع فك التشفير

import PhoneNumber from 'awesome-phonenumber'

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const handler = async (m, { conn, command }) => {
    if (!global.lastMessages || global.lastMessages.length === 0) {
        return m.reply('🍷 *لا توجد رسائل مسجلة بعد* 💤\n🔄 *سيبدأ التسجيل من الآن*\n\n『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』')
    }

    let logs = [...global.lastMessages].reverse()
    
    let text = `*✧ ──── 🍷 ──── ✧*\n`
    text += `📋 *آخر ${logs.length} رسالة من الـ Console*\n`
    text += `*✧ ──── 🍷 ──── ✧*\n\n`

    for (let i = 0; i < logs.length; i++) {
        let log = logs[i]
        
        // ─── فك تشفير sender ───
        let senderJid = conn.decodeJid(log.sender || '')
        let senderNum = senderJid.split('@')[0]
        
        // محاولة تحويل الرقم لصيغة دولية
        let phoneNumber = ''
        try {
            if (senderNum && !isNaN(senderNum) && senderNum.length >= 10) {
                let pn = PhoneNumber('+' + senderNum)
                phoneNumber = pn.getNumber('international') || senderNum
            }
        } catch (e) {}
        
        let senderName = log.senderName || conn.getName(senderJid) || 'مجهول'
        let displaySender = phoneNumber || senderNum || 'مجهول'
        
        // ─── فك تشفير chat ───
        let chatJid = conn.decodeJid(log.chat || '')
        let chatName = ''
        try {
            chatName = await conn.getName(chatJid)
        } catch (e) {
            chatName = chatJid.split('@')[0]
        }
        
        let chatType = log.isGroup ? '👥 جروب' : '💌 خاص'
        let msgText = log.text || log.body || '[وسائط/غير نصية]'
        
        // تقصير الرسالة لو طويلة
        if (msgText.length > 40) msgText = msgText.substring(0, 40) + '...'
        
        // تنسيق الوقت
        let time = new Date(log.time).toLocaleTimeString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        })
        
        text += `*${i + 1}.* ⏰ ${time}\n`
        text += `👤 *${senderName}*\n`
        text += `📱 \`${displaySender}\`\n`
        text += `📌 ${chatType} | *${chatName}*\n`
        text += `💬 ${msgText}\n`
        text += `\n`
        
        // لو وصلنا 30 نتوقف
        if (i >= 29) break
    }

    text += `*✧ ──── 🍷 ──── ✧*\n`
    text += `『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`

    // إرسال الرسالة
    await conn.sendMessage(m.chat, { text: text }, { quoted: m })

    // ─── لو عاوز JSON مفصل ───
    if (m.text.includes('json') || m.text.includes('تفصيل')) {
        let jsonLogs = []
        for (let log of logs) {
            let senderJid = conn.decodeJid(log.sender || '')
            let chatJid = conn.decodeJid(log.chat || '')
            
            let phoneNumber = ''
            try {
                let pn = PhoneNumber('+' + senderJid.split('@')[0])
                phoneNumber = pn.getNumber('international') || ''
            } catch (e) {}
            
            jsonLogs.push({
                sender_raw: log.sender,
                sender_decoded: senderJid,
                sender_phone: phoneNumber,
                sender_name: log.senderName || conn.getName(senderJid),
                text: log.text || log.body,
                isGroup: log.isGroup,
                chat_raw: log.chat,
                chat_decoded: chatJid,
                chat_name: await conn.getName(chatJid).catch(() => ''),
                time: new Date(log.time).toISOString()
            })
        }
        
        let jsonText = '```json\n' + JSON.stringify(jsonLogs, null, 2).substring(0, 3500) + '\n```'
        await conn.sendMessage(m.chat, { text: jsonText }, { quoted: m })
    }
}

handler.help = ['اخر30']
handler.tags = ['owner']
handler.command = /^(اخر30|last30|logs)$/i
handler.owner = true
handler.rowner = true

const EREN = {
  command: ["اخر30","last30","logs"],
  description: "عرض آخر سجلات وأنشطة البوت - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".اخر30",
  elite: 'on',
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "اخر30";
  if (typeof handler === 'function') {
    return await handler(msg, {
      conn: sock || conn,
      sock: sock || conn,
      text,
      args,
      usedPrefix,
      command,
      isOwner,
      isROwner: isOwner,
      isPrems: isElite,
      sender: sender?.pn || msg.sender,
      BIDS
    });
  }
}

export default { EREN, execute };
