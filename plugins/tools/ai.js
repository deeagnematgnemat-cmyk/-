//@Eren/changes Customized for Eren framework
//@Eren/note Ports notrack.ai.py to JS: supports AI-Minimax, AI-ChatGPT, NoTrack, Synthesis models with Eren branding

import axios from 'axios';

const API_URL = 'https://notrack.ai';

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

// Map friendly names to API model codes (same as Python script)
const MODEL_MAP = {
  'minimax':  'A',
  'chatgpt':  'B',
  'notrack':  'C',
  'synthesis':'F',
  'a': 'A', 'b': 'B', 'c': 'C', 'f': 'F'
};

const DEFAULT_MODEL = 'B'; // AI-ChatGPT

const EREN = {
  command: ['ai', 'llm', 'ask'],
  description: 'دردشة مع نماذج notrack.ai (ChatGPT / Minimax / NoTrack / Synthesis) - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』',
  usage: '.ai [نموذج] <سؤال>  |  النماذج: chatgpt | minimax | notrack | synthesis',
  elite: 'off',
  lock: 'off',
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

/**
 * Build the dispatch request body.
 */
function buildRequest(prompt, modelCode) {
  return {
    user_input: prompt,
    mode: 'usual',
    model: modelCode,
    persona: 'normal',
    max_turns: 6,
    chat_id: null,
    attachments: [],
    regenerate: false,
    edit: false,
    edit_mid: null,
    via: 'typed'
  };
}

/**
 * Stream the response from notrack.ai and collect delta chunks.
 */
async function queryNotrack(prompt, modelCode) {
  const response = await axios.post(
    `${API_URL}/api/dispatch`,
    buildRequest(prompt, modelCode),
    {
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Encoding': 'identity',
        'Content-Type': 'application/json'
      }
    }
  );

  return new Promise((resolve, reject) => {
    let result = '';
    let buffer = '';

    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;

        try {
          const event = JSON.parse(payload);
          if (event.type === 'delta' && event.chunk) {
            result += event.chunk;
          }
        } catch {}
      }
    });

    response.data.on('end', () => resolve(result.trim()));
    response.data.on('error', reject);
  });
}

async function execute({ sock, msg, args }) {
  const chatId = msg.key.remoteJid;

  if (!args.length) {
    return sock.sendMessage(chatId, {
      text:
        '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - أمر الذكاء الاصطناعي*\n\n' +
        'الاستخدام: `.ai [model] <your question>`\n\n' +
        '*النماذج المتاحة:*\n' +
        '• `chatgpt` — ChatGPT 5 (افتراضي)\n' +
        '• `minimax` — Minimax 2.7\n' +
        '• `notrack` — NoTrack\n' +
        '• `synthesis` — Synthesis\n\n' +
        '*مثال:* `.ai minimax ما هو الذكاء الاصطناعي؟`'
    }, { quoted: msg });
  }

  // Detect if first arg is a model name
  let modelCode = DEFAULT_MODEL;
  let promptArgs = args;

  const firstArgLower = args[0].toLowerCase();
  if (MODEL_MAP[firstArgLower]) {
    modelCode = MODEL_MAP[firstArgLower];
    promptArgs = args.slice(1);
  }

  const prompt = promptArgs.join(' ').trim();
  if (!prompt) {
    return sock.sendMessage(chatId, {
      text: '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❗ أرسل سؤالاً بعد اسم النموذج.'
    }, { quoted: msg });
  }

  // Send a "thinking" reaction
  await sock.sendMessage(chatId, { react: { text: '🍷', key: msg.key } });

  try {
    const answer = await queryNotrack(prompt, modelCode);

    if (!answer) {
      await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      return sock.sendMessage(chatId, {
        text: '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ لم يرد النموذج بأي نص. حاول مرة أخرى.'
      }, { quoted: msg });
    }

    await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    return sock.sendMessage(chatId, { text: `🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n\n${answer}` }, { quoted: msg });

  } catch (err) {
    console.error('Error in notrack plugin:', err.message);
    await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    return sock.sendMessage(chatId, {
      text: `🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ خطأ في الاتصال بـ notrack.ai:\n${err.message}`
    }, { quoted: msg });
  }
}

export default { EREN, execute };
