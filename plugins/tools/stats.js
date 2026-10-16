//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/group/stats.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - إحصائيات الرسائل في المجموعة 📊

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

// بيانات المجموعات
if (!global.groupData) global.groupData = {};

let handler = async (m, { conn, participants, groupMetadata, command }) => {
    const chatId = m.chat;

    if (!global.groupData[chatId]) global.groupData[chatId] = {};
    const groupUsers = global.groupData[chatId];

    if (!groupUsers[m.sender]) groupUsers[m.sender] = { messagesSent: 0 };

    const groupName = groupMetadata?.subject || (m.isGroup ? 'المجموعة' : 'محادثة خاصة');
    
    // رابط الفيديو الاحتياطي (في حالة عدم وجود صورة)
    const videoUrl = 'https://file.garden/aauvg01sjleV_ic1/VID-20260529-WA0150.mp4';

    // محاولة جلب صورة المستخدم
    let hasProfilePic = false;
    let profilePicUrl = null;
    
    try {
        profilePicUrl = await conn.profilePictureUrl(m.sender, 'image');
        hasProfilePic = true;
    } catch (e) {
        hasProfilePic = false;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. عرض إحصائيات الفرد (رسائلي)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (command === 'رسائلي' || command === 'رسايلي') {
        const messagesSent = groupUsers[m.sender].messagesSent || 0;
        
        const caption = `╭━━ 📊 *إحصائيات رسائلك* ━━⃝🍷
│
│ 👤 *المستخدم:* ${m.pushName || m.sender.split('@')[0]}
│ 👥 *المجموعة:* ${groupName}
│ 📨 *الرسائل:* ${messagesSent}
│
╰━━━━━━━━━━━━━⃝🍷\n\n『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`;

        if (hasProfilePic && profilePicUrl) {
            await conn.sendMessage(m.chat, {
                image: { url: profilePicUrl },
                caption: caption
            }, { quoted: m });
        } else {
            await conn.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: caption,
                gifPlayback: false,
                mimetype: 'video/mp4'
            }, { quoted: m });
        }
        
        await conn.sendMessage(m.chat, { react: { text: '🍷', key: m.key } });
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. عرض إجمالي المجموعة (اجمالي)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else if (command === 'اجمالي' || command === 'total') {
        const memberList = Array.isArray(participants) ? participants : [];
        const activeMembers = new Set(memberList.map(p => p.id));
        
        const sortedUsers = Object.entries(groupUsers)
            .filter(([jid]) => activeMembers.has(jid))
            .sort((a, b) => (b[1].messagesSent || 0) - (a[1].messagesSent || 0));

        const totalMessages = sortedUsers.reduce((sum, u) => sum + (u[1].messagesSent || 0), 0);
        const totalMembers = memberList.length;

        let resultMessage = `╭━━ 📊 *إحصائيات المجموعة* ━━⃝🍷
│
│ 📌 *المجموعة:* ${groupName}
│ 👥 *الأعضاء:* ${totalMembers}
│ 📨 *الإجمالي:* ${totalMessages} رسالة
│
╰━━━━━━━━━━━━━⃝🍷`;

        if (sortedUsers.length > 0) {
            const king = sortedUsers[0];
            let kingName = king[0].split('@')[0];
            try {
                const nameFromConn = await conn.getName(king[0]);
                if (nameFromConn) kingName = nameFromConn;
            } catch(e) {}
            
            resultMessage += `\n╭━━ 👑 *ملك التفاعل* ━━⃝🍷
│
│ 👤 *الاسم:* ${kingName}
│ 📨 *الرسائل:* ${king[1].messagesSent}
│
╰━━━━━━━━━━━━━⃝🍷`;
        }

        resultMessage += `\n╭━━ 🏆 *ترتيب الأعضاء (Top 10)* ━━⃝🍷`;

        for (let i = 0; i < Math.min(sortedUsers.length, 10); i++) {
            const [user, data] = sortedUsers[i];
            let userName = user.split('@')[0];
            try {
                const nameFromConn = await conn.getName(user);
                if (nameFromConn) userName = nameFromConn;
            } catch(e) {}
            resultMessage += `\n│ ${i + 1}. ${userName} ⇽ (${data.messagesSent})`;
        }

        resultMessage += `\n╰━━━━━━━━━━━━━⃝🍷\n\n『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`;

        let groupPic = null;
        try {
            groupPic = await conn.profilePictureUrl(m.chat, 'image');
        } catch(e) {}

        if (groupPic) {
            await conn.sendMessage(m.chat, {
                image: { url: groupPic },
                caption: resultMessage,
                mentions: sortedUsers.slice(0, 10).map(([user]) => user)
            }, { quoted: m });
        } else {
            await conn.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: resultMessage,
                gifPlayback: false,
                mimetype: 'video/mp4',
                mentions: sortedUsers.slice(0, 10).map(([user]) => user)
            }, { quoted: m });
        }
        
        await conn.sendMessage(m.chat, { react: { text: '🍷', key: m.key } });
    }
};

// تحديث العداد تلقائياً لكل رسالة
handler.all = async (m) => {
    if (!m.text || !m.isGroup) return;
    
    if (!global.groupData) global.groupData = {};
    const chatId = m.chat;
    if (!global.groupData[chatId]) global.groupData[chatId] = {};

    const groupUsers = global.groupData[chatId];
    if (!groupUsers[m.sender]) groupUsers[m.sender] = { messagesSent: 0 };
    groupUsers[m.sender].messagesSent += 1;
};

handler.help = ['رسائلي', 'اجمالي'];
handler.tags = ['unions'];
handler.command = /^(رسائلي|رسايلي|اجمالي|total)$/i;
handler.group = true;

const EREN = {
  command: ["رسائلي","رسايلي","اجمالي","total"],
  description: "إحصائيات الرسائل والتفاعل - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".رسائلي",
  elite: 'off',
  lock: "off",
  group: true,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS, groupMetadata, participants, command }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const cmd = command || "رسائلي";
  if (typeof handler === 'function') {
    return await handler(msg, {
      conn: sock || conn,
      sock: sock || conn,
      text,
      args,
      usedPrefix,
      command: cmd,
      isOwner,
      isROwner: isOwner,
      isPrems: isElite,
      sender: sender?.pn || msg.sender,
      BIDS,
      groupMetadata,
      participants
    });
  }
}

export default { EREN, execute };
