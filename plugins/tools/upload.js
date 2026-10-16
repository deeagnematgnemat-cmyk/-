//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// commands/upload.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - رفع الملفات إلى سيرفرات 🚀

import axios from 'axios';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { theme } from '../../lib/theme.js';

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

// Catbox userhash
const CATBOX_USERHASH = '212ce85752788d4a6166e44eb';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || '';

  // ✅ عرض قائمة السيرفرات
  if (!m.quoted && !text) {
    return m.reply(theme.build([
      { type: 'title', text: '📤 رفع الملفات - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
      { type: 'subtitle', text: 'اختر سيرفر الرفع' },
      { type: 'divider' },
      { type: 'info', label: '1', value: 'Gofile (أي ملف)' },
      { type: 'info', label: '2', value: 'Catbox (أي ملف) 🔥' },
      { type: 'info', label: '3', value: 'Quax (أي ملف)' },
      { type: 'info', label: '4', value: 'Uguu (أي ملف)' },
      { type: 'divider' },
      { type: 'line', text: `📌 رد على ملف ثم اكتب ${usedPrefix + command} 2` },
      { type: 'line', text: `📌 أو رد على ملف واكتب ${usedPrefix + command} فقط` }
    ]));
  }

  // ✅ الرفع التلقائي على Catbox (افتراضي)
  if (m.quoted && !text) {
    await uploadToCatboxHandler(m, conn, q);
    return;
  }

  // ✅ رفع مع اختيار السيرفر
  if (m.quoted && text) {
    const option = parseInt(text);
    if (isNaN(option) || option < 1 || option > 4) {
      return m.reply(theme.build([
        { type: 'title', text: '❌ خطأ' },
        { type: 'error', text: 'الرجاء إدخال رقم صحيح بين 1 و 4' }
      ]));
    }

    switch (option) {
      case 1:
        await uploadToGofileHandler(m, conn, q);
        break;
      case 2:
        await uploadToCatboxHandler(m, conn, q);
        break;
      case 3:
        await uploadToQuaxHandler(m, conn, q);
        break;
      case 4:
        await uploadToUguuHandler(m, conn, q);
        break;
      default:
        m.reply('❌ خيار غير صحيح');
    }
    return;
  }
};

// ═══════════════════════════════════════════════════════════════
// دوال رفع Catbox
// ═══════════════════════════════════════════════════════════════

async function uploadToCatboxHandler(m, conn, q) {
  await m.react('🍷');
  try {
    const mime = (q.msg || q).mimetype || '';
    
    const stream = await downloadContentFromMessage(q.msg || q, mime.split('/')[0]);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    const type = await fileTypeFromBuffer(buffer);
    const ext = type?.ext || 'bin';

    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('userhash', CATBOX_USERHASH);
    form.append('fileToUpload', buffer, { filename: `file.${ext}` });

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form,
      headers: { ...form.getHeaders() }
    });

    const link = await res.text();

    if (!res.ok || !link.startsWith('https://')) throw new Error(link);

    await m.react('✅');
    await m.reply(theme.build([
      { type: 'title', text: '✅ تـم الـرفـع بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
      { type: 'info', label: '☁️ السيرفر', value: 'Catbox' },
      { type: 'divider' },
      { type: 'info', label: '🔗 الرابط', value: link.trim() }
    ]));

  } catch (error) {
    await m.react('❌');
    await m.reply(theme.build([
      { type: 'title', text: '❌ فـشـل Catbox' },
      { type: 'error', text: error.message }
    ]));
  }
}

// ═══════════════════════════════════════════════════════════════
// دالة رفع Gofile
// ═══════════════════════════════════════════════════════════════

async function uploadToGofileHandler(m, conn, q) {
  await m.react('🍷');
  try {
    const media = await q.download();
    const { ext } = await fileTypeFromBuffer(media);

    const form = new FormData();
    form.append('file', media, `file.${ext}`);

    const res = await fetch('https://store1.gofile.io/uploadFile', {
      method: 'POST',
      body: form
    });

    const data = await res.json();
    if (data.status !== 'ok') throw new Error('فشل الرفع');

    await m.react('✅');
    await m.reply(theme.build([
      { type: 'title', text: '✅ تـم الـرفـع بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
      { type: 'info', label: '☁️ السيرفر', value: 'Gofile' },
      { type: 'divider' },
      { type: 'info', label: '🔗 الرابط', value: data.data.downloadPage }
    ]));

  } catch (error) {
    await m.react('❌');
    await m.reply(theme.build([
      { type: 'title', text: '❌ فـشـل Gofile' },
      { type: 'error', text: error.message }
    ]));
  }
}

// ═══════════════════════════════════════════════════════════════
// دالة رفع Quax
// ═══════════════════════════════════════════════════════════════

async function uploadToQuaxHandler(m, conn, q) {
  await m.react('🍷');
  try {
    const media = await q.download();
    const { ext } = await fileTypeFromBuffer(media);

    const form = new FormData();
    form.append('files[]', media, `file.${ext}`);

    const res = await fetch('https://qu.ax/upload.php', {
      method: 'POST',
      body: form
    });

    const result = await res.json();
    if (!result?.success) throw new Error('فشل الرفع');

    await m.react('✅');
    await m.reply(theme.build([
      { type: 'title', text: '✅ تـم الـرفـع بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
      { type: 'info', label: '☁️ السيرفر', value: 'Quax' },
      { type: 'divider' },
      { type: 'info', label: '🔗 الرابط', value: result.files[0].url }
    ]));

  } catch (error) {
    await m.react('❌');
    await m.reply(theme.build([
      { type: 'title', text: '❌ فـشـل Quax' },
      { type: 'error', text: error.message }
    ]));
  }
}

// ═══════════════════════════════════════════════════════════════
// دالة رفع Uguu
// ═══════════════════════════════════════════════════════════════

async function uploadToUguuHandler(m, conn, q) {
  await m.react('🍷');
  try {
    const media = await q.download();
    const { ext } = await fileTypeFromBuffer(media);

    const form = new FormData();
    form.append('files[]', media, `file.${ext}`);

    const res = await fetch('https://uguu.se/upload.php', {
      method: 'POST',
      body: form
    });

    const result = await res.json();
    if (!result.files?.length) throw new Error('فشل الرفع');

    await m.react('✅');
    await m.reply(theme.build([
      { type: 'title', text: '✅ تـم الـرفـع بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
      { type: 'info', label: '☁️ السيرفر', value: 'Uguu' },
      { type: 'divider' },
      { type: 'info', label: '🔗 الرابط', value: result.files[0].url }
    ]));

  } catch (error) {
    await m.react('❌');
    await m.reply(theme.build([
      { type: 'title', text: '❌ فـشـل Uguu' },
      { type: 'error', text: error.message }
    ]));
  }
}

handler.help = ['رفع'];
handler.tags = ['tools'];
handler.command = ['رفع', 'لرابط', 'upload'];

const EREN = {
  command: ["رفع","لرابط","upload"],
  description: "رفع الوسائط إلى روابط Catbox و Gofile - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".رفع",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "رفع";
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
