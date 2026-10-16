//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/game-guess.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - لعبة احزر الشخصية 🎭

import { theme } from '../../lib/theme.js';
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

const timeout = 60000;

let handler = async (m, { conn, command }) => {
    conn.eren = conn.eren || {};
    let id = m.chat;

    // معالج الإجابة على الأزرار
    if (command.startsWith('جوابي_')) {
        let erenGame = conn.eren[id];

        if (!erenGame) {
            return conn.reply(m.chat, theme.build([
                { type: 'title', text: '⚠️ تـنـبـيـه' },
                { type: 'subtitle', text: 'لا توجد لعبة نشطة الآن' }
            ]), m);
        }

        let selectedAnswerIndex = parseInt(command.split('_')[1]);
        if (isNaN(selectedAnswerIndex) || selectedAnswerIndex < 1 || selectedAnswerIndex > 4) {
            return conn.reply(m.chat, theme.build([
                { type: 'title', text: 'خـطـأ' },
                { type: 'subtitle', text: 'اختيار غير صالح' }
            ]), m);
        }

        let selectedAnswer = erenGame.options[selectedAnswerIndex - 1];
        let isCorrect = erenGame.correctAnswer === selectedAnswer;

        if (isCorrect) {
            // إضافة نقاط
            if (!global.db.data.users[m.sender].points) {
                global.db.data.users[m.sender].points = 0;
            }
            global.db.data.users[m.sender].points += 500;

            await conn.reply(m.chat, theme.build([
                { type: 'title', text: '✅ إجـابـة صـحـيـحـة' },
                { type: 'subtitle', text: '🎉 مبروك! +500 نقطة' },
                { type: 'divider' },
                { type: 'info', label: 'الإجابة', value: erenGame.correctAnswer },
                { type: 'info', label: 'نقاطك', value: `${global.db.data.users[m.sender].points} نقطة` }
            ]), m);
            
            clearTimeout(erenGame.timer);
            delete conn.eren[id];
        } else {
            erenGame.attempts -= 1;
            if (erenGame.attempts > 0) {
                await conn.reply(m.chat, theme.build([
                    { type: 'title', text: '❌ إجـابـة خـاطـئـة' },
                    { type: 'subtitle', text: `المحاولات المتبقية: ${erenGame.attempts}` },
                    { type: 'divider' },
                    { type: 'line', text: 'حاول مرة أخرى' }
                ]), m);
            } else {
                await conn.reply(m.chat, theme.build([
                    { type: 'title', text: '❌ انـتـهـت الـمـحـاولـات' },
                    { type: 'subtitle', text: `الإجابة الصحيحة هي: ${erenGame.correctAnswer}` },
                    { type: 'divider' },
                    { type: 'line', text: 'استخدم .احزر للعب مرة أخرى' }
                ]), m);
                clearTimeout(erenGame.timer);
                delete conn.eren[id];
            }
        }
        return;
    }

    // بدء لعبة جديدة
    try {
        if (conn.eren[id]) {
            return conn.reply(m.chat, theme.build([
                { type: 'title', text: '⚠️ تـنـبـيـه' },
                { type: 'subtitle', text: 'يوجد لعبة سابقة لم تنتهي' }
            ]), m);
        }

        const response = await fetch('https://gist.githubusercontent.com/Kyutaka101/98d564d49cbf9b539fee19f744de7b26/raw/f2a3e68bbcdd2b06f9dbd5f30d70b9fda42fec14/guessflag');
        const erenData = await response.json();

        const erenItem = erenData[Math.floor(Math.random() * erenData.length)];
        const { img, name } = erenItem;

        let options = [name];
        while (options.length < 4) {
            let randomItem = erenData[Math.floor(Math.random() * erenData.length)].name;
            if (!options.includes(randomItem)) options.push(randomItem);
        }
        options.sort(() => Math.random() - 0.5);

        const media = await prepareWAMessageMedia({ image: { url: img } }, { upload: conn.waUploadToServer });

        // بناء الأزرار
        const buttons = options.map((option, index) => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: `🍷 ${option}`,
                id: `.جوابي_${index + 1}`
            })
        }));

        const interactiveMessage = {
            body: { text: `> ${theme.divider}
>
> 🍷 *لـعـبـة احـزر الـشـخـصـيـة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』* 🎭
> 𖤐⃝🍷 *من هي هذه الشخصية؟*
>
> ${theme.smallDivider}
>
> 👁️⃝🍷 *الـوقـت:* 60 ثانية
> ☣️⃝🍷 *الجـائـزة:* 500 نقطة
> 𖤐⃝🍷 *المحاولات:* 2
>
> ${theme.endDivider}` },
            footer: { text: '『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
            header: {
                hasMediaAttachment: true,
                subtitle: '🎭 اختر الإجابة الصحيحة',
                imageMessage: media.imageMessage,
            },
            nativeFlowMessage: {
                buttons: buttons,
                messageParamsJson: JSON.stringify({
                    bottom_sheet: {
                        list_title: "🎭 اختر اسم الشخصية",
                        button_title: "▻ الخيارات 🍷"
                    }
                })
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

        conn.eren[id] = {
            correctAnswer: name,
            options: options,
            timer: setTimeout(async () => {
                if (conn.eren[id]) {
                    await conn.reply(m.chat, theme.build([
                        { type: 'title', text: '⏰ انـتـهى الـوقـت' },
                        { type: 'subtitle', text: `الإجابة الصحيحة هي: ${name}` },
                        { type: 'divider' },
                        { type: 'line', text: 'استخدم .احزر للعب مرة أخرى' }
                    ]), m);
                    delete conn.eren[id];
                }
            }, timeout),
            attempts: 2
        };

    } catch (e) {
        console.error(e);
        conn.reply(m.chat, theme.build([
            { type: 'title', text: 'خـطـأ' },
            { type: 'subtitle', text: 'حدث خطأ في تحميل اللعبة' }
        ]), m);
    }
};

handler.help = ['احزر'];
handler.tags = ['game'];
handler.command = /^(احزر|احذر|جوابي_\d+)$/i;


const EREN = {
  command: ["احزر", "احذر"],
  description: "لعبة احزر التفاعلية - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".احزر",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "احزر";
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
