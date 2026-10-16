//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// commands/download_spotify.js
// 🎵 تحميل أغاني سبوتيفاي - 𝐸𝓇𝑒𝓃 🍷 𝘚𝘺𝘴𝘵𝘦ܡ 🎵

import fetch from 'node-fetch';

let handler = async (m, { conn, text, usedPrefix }) => {
  // 1. التحقق من وجود رابط
  if (!text) {
    await conn.sendMessage(m.chat, { 
      text: `🎵 *تحميل من سبوتيفاي - 𝐸𝓇𝑒𝓃 🍷*\n\n📌 *الاستخدام:*\n${usedPrefix}سبوتيفاي <رابط الأغنية>\n\n📌 *مثال:*\n${usedPrefix}سبوتيفاي https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT` 
    }, { quoted: m });
    return;
  }

  // 2. استخراج رابط الـ track
  const spotifyRegex = /(?:https?:\/\/)?(?:open\.spotify\.com\/track\/)([a-zA-Z0-9]+)/;
  const match = text.match(spotifyRegex);
  
  if (!match) {
    await conn.sendMessage(m.chat, { text: '❌ *رابط سبوتيفاي غير صالح!*\n\nيرجى إرسال رابط صحيح من نوع track' }, { quoted: m });
    return;
  }

  const spotifyUrl = match[0];

  // 3. رسالة جاري جلب المعلومات
  await conn.sendMessage(m.chat, { 
    text: `🎵 *جاري جلب معلومات الأغنية بواسطة 𝐸𝓇𝑒𝓃 🍷...*\n\n⏳ الرجاء الانتظار...`,
    react: { text: '⏳', key: m.key }
  }, { quoted: m });

  try {
    // 4. الاتصال بالـ API
    const apiUrl = 'https://gamepvz.com/api/download/get-url';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://gamepvz.com',
        'Referer': 'https://gamepvz.com/'
      },
      body: JSON.stringify({ url: spotifyUrl })
    });
    
    const data = await response.json();
    
    if (data.code !== 200 || !data.originalVideoUrl) {
      throw new Error('فشل التحميل');
    }

    // 5. تجهيز رابط التحميل
    const downloadUrl = `https://gamepvz.com${data.originalVideoUrl}`;
    
    // 6. تحميل صورة الغلاف
    let coverBuffer = null;
    if (data.coverUrl) {
      try {
        const coverRes = await fetch(data.coverUrl);
        coverBuffer = await coverRes.buffer();
      } catch (e) {
        console.log('خطأ في تحميل الصورة');
      }
    }

    // 7. إرسال صورة + كلام في نفس الرسالة
    const caption = `📥 *جاري تحميل الأغنية بواسطة 𝐸𝓇𝑒𝓃 🍷...*\n\n🎤 *الأغنية:* ${data.title || 'غير معروف'}\n👤 *الفنان:* ${data.authorName || 'غير معروف'}\n\n⏳ جاري تجهيز الملف...`;
    
    if (coverBuffer) {
      await conn.sendMessage(m.chat, {
        image: coverBuffer,
        caption: caption
      }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
    }

    // 8. إرسال الصوت
    await conn.sendMessage(m.chat, {
      audio: { url: downloadUrl },
      mimetype: 'audio/mpeg',
      fileName: `${data.title || 'song'} - ${(data.authorName || 'artist').split(',')[0]}.mp3`
    }, { quoted: m });

    // تفاعل بنجاح
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    console.error("Error in execution:", error);
    
    await conn.sendMessage(m.chat, { 
      text: `❌ *فشل تحميل الأغنية!*\n\n⚠️ *السبب:* قد يكون الرابط غير صالح أو الخدمة معطلة\n🔄 *الحل:* حاول مرة أخرى أو تأكد من الرابط` 
    }, { quoted: m });
    
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
  }
};

// معلومات الأمر
handler.help = ['سبوتيفاي <رابط>'];
handler.tags = ['download'];
handler.command = ['سبوتيفاي', 'spotify', 'تحميل اغنية', 'اغنية'];


const EREN = {
  command: ["سبوتيفاي", "spotify", "اغنية", "تحميل_اغنية"],
  description: "تحميل مقاطع وأغاني سبوتيفاي",
  usage: ".سبوتيفاي [رابط]",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "سبوتيفاي";
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
