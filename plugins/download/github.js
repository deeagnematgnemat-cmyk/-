//@Eren/changes Converted from DEJAVU to Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/github.js
// 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ - البحث عن مستودعات جيتهاب وتحميلها 💻

import axios from 'axios';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import { theme } from '../../lib/theme.js';

const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;

let handler = async (m, { conn, text, usedPrefix, command }) => {
    
    // 🔍 البحث في جيتهاب
    if (command === 'جيتهاب' || command === 'github') {
        if (!text) {
            return conn.reply(m.chat, theme.build([
                { type: 'title', text: 'طـريـقـة الاسـتـخـدام - 𝐸𝓇𝑒𝓃 🍷' },
                { type: 'subtitle', text: 'البحث عن مستودعات في جيتهاب' },
                { type: 'divider' },
                { type: 'info', label: 'مثال', value: `${usedPrefix}${command} whatsapp-bot` }
            ]), m);
        }

        await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } });

        try {
            const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(text)}&per_page=20`;
            const { data } = await axios.get(url, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });

            if (!data.items.length) {
                throw new Error("❌ لم يتم العثور على نتائج.");
            }

            // بناء قائمة المستودعات
            const sections = data.items.map((repo) => ({
                title: `📂 ${repo.name}`,
                rows: [{
                    title: `📥 تـحـمـيـل الـمـسـتـودع`,
                    description: `⭐ ${repo.stargazers_count} نجم | 🍴 ${repo.forks_count} فرع | 👤 ${repo.owner.login}`,
                    id: `${usedPrefix}تحميل ${repo.html_url}`
                }]
            }));

            const interactiveMessage = {
                body: { text: `> ${theme.divider}
>
> 🍷 *نـتـائـج الـبـحـث عـن:* ${text}
> 🍷⃝✨ *عدد النتائج:* ${data.items.length}
>
> ${theme.smallDivider}
>
> 👁️⃝🍷 *اختر المستودع المطلوب*
>
> ${theme.endDivider}` },
                footer: { text: '🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷' },
                header: { hasMediaAttachment: false },
                nativeFlowMessage: {
                    buttons: [{
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: '📋 قـائـمـة الـمـسـتـودعـات',
                            sections
                        })
                    }]
                }
            };

            let msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveMessage)
                    }
                }
            }, { userJid: conn.user.id, quoted: m });

            await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error(e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            await conn.reply(m.chat, theme.build([
                { type: 'title', text: '❌ خـطـأ' },
                { type: 'subtitle', text: e.message || 'حدث خطأ أثناء البحث' }
            ]), m);
        }
    }

    // 📥 تحميل المستودع
    if (command === 'تحميل') {
        if (!text) {
            return conn.reply(m.chat, theme.build([
                { type: 'title', text: 'طـريـقـة الاسـتـخـدام' },
                { type: 'subtitle', text: 'تحميل مستودع من جيتهاب' },
                { type: 'divider' },
                { type: 'info', label: 'مثال', value: `${usedPrefix}${command} https://github.com/user/repo` }
            ]), m);
        }

        if (!regex.test(text)) {
            return conn.reply(m.chat, theme.build([
                { type: 'title', text: '❌ خـطـأ' },
                { type: 'subtitle', text: 'الرابط غير صالح، يرجى إدخال رابط جيتهاب صحيح' }
            ]), m);
        }

        let [_, user, repo] = text.match(regex) || [];
        repo = repo.replace(/.git$/, '');
        const zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;

        await conn.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

        try {
            await conn.sendMessage(m.chat, {
                document: { url: zipUrl },
                mimetype: 'application/zip',
                fileName: `${repo}.zip`,
                caption: theme.build([
                    { type: 'title', text: '✅ تـم الـتـحـمـيـل بـواسطـة 𝐸𝓇𝑒𝓃 🍷' },
                    { type: 'subtitle', text: `تم تجهيز المستودع` },
                    { type: 'divider' },
                    { type: 'info', label: 'الـمـسـتـودع', value: repo },
                    { type: 'info', label: 'الـمـالـك', value: user }
                ])
            }, { quoted: m });
            
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        } catch (e) {
            console.error(e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            await conn.reply(m.chat, theme.build([
                { type: 'title', text: '❌ خـطـأ' },
                { type: 'subtitle', text: 'فشل تحميل المستودع، حاول مرة أخرى' }
            ]), m);
        }
    }
};

handler.help = ['جيتهاب <اسم>', 'تحميل <رابط>'];
handler.tags = ['downloader'];
handler.command = /^(جيتهاب|github|تحميل)$/i;


const EREN = {
  command: ["جيتهاب", "github"],
  description: "تنزيل وتحميل مستودعات جيت هاب",
  usage: ".جيتهاب [اسم المستودع]",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "جيتهاب";
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

export default { EREN, DEJAVU: EREN, AIZEN: EREN, execute };
