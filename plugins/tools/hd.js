//@Eren/changes Customized for Eren framework
//@Eren/note Image enhancement using ffmpeg (lanczos 2x upscale + unsharp) with sharp fallback

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { theme } from '../../lib/theme.js';

const execAsync = promisify(exec);

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

async function enhanceImage(mediaBuffer) {
  // 1. Try sharp if dynamically available
  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default;
    const image = sharp(mediaBuffer);
    const metadata = await image.metadata();
    const newWidth = (metadata.width || 500) * 2;
    const newHeight = (metadata.height || 500) * 2;
    return await image
      .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
      .sharpen()
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
      .toBuffer();
  } catch (e) {
    // Sharp not available or failed; fallback to ffmpeg
  }

  // 2. FFmpeg 2x upscale and sharpening
  const tmpIn = path.join(os.tmpdir(), `hd_in_${Date.now()}.png`);
  const tmpOut = path.join(os.tmpdir(), `hd_out_${Date.now()}.jpg`);
  try {
    fs.writeFileSync(tmpIn, mediaBuffer);
    await execAsync(`ffmpeg -y -i "${tmpIn}" -vf "scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:1.0:5:5:0.0" -q:v 2 "${tmpOut}"`);
    if (fs.existsSync(tmpOut)) {
      return fs.readFileSync(tmpOut);
    }
  } catch (err) {
    console.error("Error in ffmpeg upscale:", err);
  } finally {
    try { if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn); } catch (e) {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
  }

  return mediaBuffer;
}

const EREN = {
  command: ["تحسين", "hd", "جوده", "جودة"],
  description: "تحسين جودة الصور ودقتها بمقدار 2X - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".تحسين (بالرد على صورة)",
  elite: "off",
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const chatId = msg.key.remoteJid;
  const quoted = msg.quoted ? msg.quoted : msg;
  const mime = quoted.mimetype || quoted.msg?.mimetype || '';

  if (!/image\/(jpe?g|png|webp)/i.test(mime)) {
    await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    return await sock.sendMessage(chatId, {
      text: theme.build([
        { type: 'title', text: 'طـريـقـة الاسـتـخـدام - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
        { type: 'subtitle', text: 'قم بإرسال صورة أو الرد على صورة لتحسين جودتها' },
        { type: 'divider' },
        { type: 'info', label: 'أمر التفعيل', value: '.تحسين (مع صورة)' },
        { type: 'info', label: 'المطور', value: `+${EREN_INFO.ownerNumber}` },
        { type: 'info', label: 'البوت', value: `+${EREN_INFO.botNumber}` }
      ])
    }, { quoted: msg });
  }

  await sock.sendMessage(chatId, { react: { text: '🍷', key: msg.key } });

  try {
    let media = await quoted.download();
    const oldSize = (media.length / 1024).toFixed(2);

    const enhancedBuffer = await enhanceImage(media);
    const newSize = (enhancedBuffer.length / 1024).toFixed(2);

    await sock.sendMessage(chatId, {
      image: enhancedBuffer,
      caption: theme.build([
        { type: 'title', text: '✅ تـم تـحـسـيـن الـصـورة' },
        { type: 'subtitle', text: 'تمت مضاعفة الجودة وتوضيح التفاصيل بنجاح' },
        { type: 'divider' },
        { type: 'info', label: '📦 الـحـجـم', value: `${oldSize} KB → ${newSize} KB` },
        { type: 'divider' },
        { type: 'line', text: '⚡ تمت المعالجة بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🍷' }
      ])
    }, { quoted: msg });

    await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

  } catch (err) {
    console.error("Error in hd plugin:", err);
    await sock.sendMessage(chatId, { text: "🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ حصل خطأ أثناء تحسين الصورة." }, { quoted: msg });
  }
}

export default { EREN, AIZEN: EREN, execute };
