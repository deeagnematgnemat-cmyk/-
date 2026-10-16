//@Eren/changes Customized for Eren framework
//@Eren/note مراقبة إشراف المجموعة وتصفيتها إذا تم خفض أحد المشرفين مع الهوية والأرقام المعتمدة

import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../../lib/paths.js';
import { jidDecode } from '@whiskeysockets/baileys';

const monitorFile = path.join(DATA_DIR, 'monitorState.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(monitorFile)) fs.writeFileSync(monitorFile, JSON.stringify({}));

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const loadMonitorState = () => {
  try {
    return JSON.parse(fs.readFileSync(monitorFile, 'utf8'));
  } catch (err) {
    console.error("Error in execution:", err);
    return {};
  }
};

const saveMonitorState = (data) => {
  try {
    fs.writeFileSync(monitorFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error in execution:", err);
  }
};

let handlerAttached = false;

const EREN = {
  command: ["راقب", "مراقبة", "monitoring"],
  description: "مراقبة إشراف المجموعة وتصفيتها إذا تم خفض أحد المشرفين - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".راقب",
  elite: "on",
  lock: "off",
  group: true,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, sender, isElite, isDeveloper, isOwner }) {
  const groupId = msg.key.remoteJid;
  const senderId = sender?.pn || msg.key.participant || msg.participant;

  if (!groupId.endsWith('@g.us')) {
    return sock.sendMessage(groupId, { text: '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: msg });
  }

  if (!isElite && !isDeveloper && !isOwner) {
    return sock.sendMessage(groupId, { text: '*ما معك صلاحية دز*' }, { quoted: msg });
  }

  const state = loadMonitorState();

  if (state[groupId]) {
    delete state[groupId];
    saveMonitorState(state);
    return sock.sendMessage(groupId, { text: '🍷 تم إلغاء المراقبة عن هذه المجموعة بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』.' }, { quoted: msg });
  }

  state[groupId] = true;
  saveMonitorState(state);
  sock.sendMessage(groupId, { text: '🍷 المراقبة مفعلة بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🔊' }, { quoted: msg });

  if (handlerAttached) return;

  sock.ev.on('group-participants.update', async (update) => {
    const activeState = loadMonitorState();
    const isMonitored = activeState[update.id];

    if (!isMonitored || update.action !== 'demote') return;

    try {
      await sock.sendMessage(update.id, {
        text: `👁‍🗨لـكـل فـعـل ردة فـعـل\nمـساويـة لـه فالـقـوه ومـضـاد فالاتجاه\n🗂سيتم الفتك بالمجموعه فورا بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`
      });

      const metadata = await sock.groupMetadata(update.id);
      const botId = jidDecode(sock.user.id).user + '@s.whatsapp.net';
      const ownerId = metadata.owner;

      const admins = metadata.participants.filter(p => p.admin).map(p => p.id);

      const toRemove = metadata.participants
        .filter(p => {
          const jid = p.id;
          return jid !== botId && jid !== ownerId && !admins.includes(jid);
        })
        .map(p => p.id);

      const chunkSize = 1025;
      for (let i = 0; i < toRemove.length; i += chunkSize) {
        const chunk = toRemove.slice(i, i + chunkSize);
        await sock.groupParticipantsUpdate(update.id, chunk, 'remove').catch(err => console.error(err));
        if (i + chunkSize < toRemove.length) await new Promise(res => setTimeout(res, 10));
      }

      delete activeState[update.id];
      saveMonitorState(activeState);

      await sock.sendMessage(update.id, { text: '✅ تمت تصفية المجموعة بنجاح بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』.' });
    } catch (err) {
      console.error("Error in execution:", err);
    }
  });

  handlerAttached = true;
}

export default { EREN, execute };
