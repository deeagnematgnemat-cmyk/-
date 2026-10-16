//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/jbti.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - جبتي GPT-5 مع دعم الصور 🖼️

import axios from 'axios';
import { theme } from '../../lib/theme.js';

// تعريف رقم المطور ورقم حساب البوت الرسمي
const EREN_INFO = {
    ownerNumber: "رقم_المطور_هنا", // ضع رقم المطور هنا
    botNumber: "رقم_البوت_هنا"      // ضع رقم حساب البوت هنا
};

// إدارة المحادثات لكل مستخدم
const conversations = new Map();

class GPT5 {
    constructor() {
        this.baseUrl = 'https://aifreeforever.com/api/generate-ai-answer';
        this.nonceUrl = 'https://aifreeforever.com/api/chat-nonce';
        this.headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://aifreeforever.com',
            'Referer': 'https://aifreeforever.com/chat/gpt-5',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.8'
        };
        this.cookie = '';
    }

    async getNonce() {
        try {
            const response = await axios.get(this.nonceUrl, {
                headers: {
                    'User-Agent': this.headers['User-Agent'],
                    'Origin': this.headers['Origin'],
                    'Referer': this.headers['Referer']
                },
                timeout: 10000
            });
            
            if (response.headers['set-cookie']) {
                this.cookie = response.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            }
            return response.data.nonce;
        } catch (error) {
            console.error("Error in execution:", error.message);
            return null;
        }
    }

    async chat(message, imageBuffer, history = []) {
        const nonce = await this.getNonce();
        if (!nonce) {
            throw new Error('فشل الحصول على nonce');
        }

        let fileData = null;
        if (imageBuffer) {
            const base64 = imageBuffer.toString('base64');
            let mimeType = 'image/jpeg';
            if (base64.startsWith('/9j/')) mimeType = 'image/jpeg';
            else if (base64.startsWith('iVBOR')) mimeType = 'image/png';
            else if (base64.startsWith('UklGR')) mimeType = 'image/webp';
            
            fileData = {
                data: base64,
                type: mimeType,
                name: 'image.jpg'
            };
        }

        const payload = {
            question: message,
            tone: "friendly",
            format: "paragraph",
            file: fileData,
            conversationHistory: history.map(h => ({
                role: h.role,
                content: h.content
            })),
            interactionProof: {
                nonce: nonce,
                keystrokeCount: Math.floor(Math.random() * 50) + 10,
                pasteEvents: 0,
                totalTypingTime: Math.floor(Math.random() * 5000) + 1000,
                startTime: Date.now(),
                submitTime: Date.now() + 1000
            },
            aiRole: "assistant",
            aiName: ""
        };

        try {
            const headers = { ...this.headers };
            if (this.cookie) headers['Cookie'] = this.cookie;
            
            const response = await axios.post(this.baseUrl, payload, {
                headers: headers,
                timeout: 120000
            });

            return response.data.answer || "عذراً، لم أتمكن من الرد.";
        } catch (error) {
            console.error("Error in execution:", error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message);
        }
    }
}

// ⭐ دالة محسنة لاستخراج الصورة من الرسالة أو الرد على صورة
async function getImageFromMessage(conn, m) {
    let imageBuffer = null;
    let caption = '';
    let isImage = false;
    
    // 1. هل الرسالة الحالية تحتوي على صورة؟
    if (m.message?.imageMessage) {
        isImage = true;
        caption = m.message.imageMessage.caption || '';
        try {
            imageBuffer = await m.download();
        } catch (e) { console.error("Error in execution:", e); }
    }
    
    // 2. هل هناك رسالة مقتبسة (رد) تحتوي على صورة؟
    if (!isImage && m.quoted) {
        const quotedMsg = m.quoted;
        const imageMsg = quotedMsg.message?.imageMessage || quotedMsg.imageMessage;
        
        if (imageMsg) {
            isImage = true;
            caption = imageMsg.caption || '';
            try {
                imageBuffer = await m.quoted.download();
            } catch (e) { console.error("Error in execution:", e); }
        }
    }
    
    return { imageBuffer, caption, hasImage: isImage };
}

let handler = async (m, { conn, text, command }) => {
    try {
        const { imageBuffer, caption, hasImage } = await getImageFromMessage(conn, m);
        
        let question = text || caption;
        
        if (hasImage && !question) {
            question = "حلل هذه الصورة واشرح لي ماذا يوجد فيها بالتفصيل بالعربية";
        }
        
        if (!question && !hasImage) {
            return m.reply(theme.build([
                { type: 'title', text: '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』* - جبتي GPT-5' },
                { type: 'spacer' },
                { type: 'info', label: 'الاستخدام', value: '.جبتي <سؤالك>' },
                { type: 'info', label: 'مع صورة', value: 'أرسل الصورة مع نص أو رد على صورة' },
                { type: 'info', label: 'مثال', value: '.جبتي شو في هذه الصورة؟' }
            ]));
        }

        await conn.sendMessage(m.chat, { react: { text: hasImage ? '🖼️' : '🍷', key: m.key } });
        
        const statusMsg = hasImage 
            ? '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』* - 🖼️ يحلل الصورة...'
            : '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』* - 🧠 GPT-5 يفكر...';
        await m.reply(statusMsg);

        const gpt5 = new GPT5();
        let history = conversations.get(m.sender) || [];
        
        const response = await gpt5.chat(question, imageBuffer, history);
        
        if (!response) throw new Error('لم يتم الحصول على رد');
        
        history.push({ role: "user", content: hasImage ? `[صورة] ${question}` : question });
        history.push({ role: "assistant", content: response });
        if (history.length > 20) history = history.slice(-20);
        conversations.set(m.sender, history);
        
        let cleanResponse = response.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\n\n/g, '\n').trim();
        const headerText = hasImage ? '『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 (تحليل الصور)' : '『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 GPT-5';
        
        const maxLength = 4096;
        if (cleanResponse.length > maxLength) {
            const parts = cleanResponse.match(new RegExp(`.{1,${maxLength}}`, 'g'));
            for (let i = 0; i < parts.length; i++) {
                const prefix = i === 0 ? '' : '(تابع) ';
                await conn.sendMessage(m.chat, {
                    text: `╭━━ 🤖 *${headerText}* ━━⃝🍷
│
│ 💬 *سؤالك:* ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}
│
│ 📝 *الرد:* ${prefix}
│ ${parts[i]}
│
╰━━━━━━━━━━━━━⃝🍷`
                }, { quoted: m });
            }
        } else {
            await conn.sendMessage(m.chat, {
                text: `╭━━ 🤖 *${headerText}* ━━⃝🍷
│
│ 💬 *سؤالك:* ${question}
│
│ 📝 *الرد:*
│ ${cleanResponse}
│
╰━━━━━━━━━━━━━⃝🍷`
            }, { quoted: m });
        }
        
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in execution:", e);
        await m.reply(theme.build([
            { type: 'error', text: '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ حدث خطأ' },
            { type: 'info', label: 'السبب', value: e.message || 'خطأ غير معروف' },
            { type: 'warning', text: 'حاول مرة أخرى لاحقاً' }
        ]));
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    }
}

handler.help = ['جبتي <سؤال>'];
handler.command = ['جبتي', 'jbti', 'gpt5', 'chatgpt'];
handler.tags = ['ai'];

const EREN = {
  command: ["جبتي","jbti","gpt5","chatgpt"],
  description: "الدردشة والذكاء الاصطناعي GPT - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".جبتي",
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
  const command = "جبتي";
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

export default { EREN, AIZEN: EREN, execute };
