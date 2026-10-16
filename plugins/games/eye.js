//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/game-eye.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 - لعبة تخمين الشخصية من العين 👁️

import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import fetch from "node-fetch";

const timeout = 60000;
const reward = 500;

let handler = async (m, { conn, command }) => {

  conn.eren = conn.eren || {};
  const id = m.chat;

  if (command.startsWith("مجوب_")) {

    let erenGame = conn.eren[id];
    if (!erenGame) {
      await m.react("⏳");
      return conn.reply(m.chat, `✦ لا توجد لعبة نشطة حالياً - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`, m);
    }

    let selectedIndex = parseInt(command.split("_")[1]);

    if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > 4) {
      await m.react("❌");
      return conn.reply(m.chat, `✦ اختيار غير صالح`, m);
    }

    let selectedAnswer = erenGame.options[selectedIndex - 1];
    let isCorrect = erenGame.correctAnswer === selectedAnswer;

    if (isCorrect) {
      await m.react("✅");

      if (!global.db.data.users[m.sender].points) {
        global.db.data.users[m.sender].points = 0;
      }
      global.db.data.users[m.sender].points += reward;

      await conn.reply(m.chat, `🍷 إجابة صحيحة 🎉\n✦ الإجابة👁‍🗨: ${erenGame.correctAnswer}\n✦ نقاطك⭐: ${global.db.data.users[m.sender].points} نقطة`, m);

      clearTimeout(erenGame.timer);
      delete conn.eren[id];

    } else {
      erenGame.attempts -= 1;

      if (erenGame.attempts > 0) {
        await m.react("❌");
        await conn.reply(m.chat, `✦ إجابة خاطئة ❌\n✦ المحاولات المتبقية🔄: ${erenGame.attempts}`, m);
      } else {
        await m.react("❌");
        await conn.reply(m.chat, `✦ انتهت المحاولات ❌\n✦ الإجابة الصحيحة👁‍🗨: ${erenGame.correctAnswer}`, m);

        clearTimeout(erenGame.timer);
        delete conn.eren[id];
      }
    }

    return;
  }

  try {

    if (conn.eren[id]) {
      await m.react("⏳");
      return conn.reply(m.chat, `✦ لديك لعبة نشطة بالفعل ⏳`, m);
    }

    const response = await fetch(
      "https://raw.githubusercontent.com/DK3MK/worker-bot/main/eye.json"
    );

    const data = await response.json();
    if (!data.length) throw new Error("No Data");

    const item = data[Math.floor(Math.random() * data.length)];
    const { img, name } = item;

    let options = [name];
    while (options.length < 4) {
      let random = data[Math.floor(Math.random() * data.length)].name;
      if (!options.includes(random)) options.push(random);
    }
    options.sort(() => Math.random() - 0.5);

    const media = await prepareWAMessageMedia(
      { image: { url: img } },
      { upload: conn.waUploadToServer }
    );

    const buttons = options.map((option, index) => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: `🍷 ${option}`,
        id: `.مجوب_${index + 1}`
      })
    }));

    const interactiveMessage = {
      body: { text: `✦ من صاحب العين👁‍🗨 - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』\n✦ الزمن⏱️: 60 ثانية\n✦ الجائزة⭐: ${reward} نقطة\n✦ المحاولات🔄: 2` },
      footer: { text: '『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』' },
      header: {
        hasMediaAttachment: true,
        subtitle: '✦ اختر الشخصية الصحيحة',
        imageMessage: media.imageMessage,
      },
      nativeFlowMessage: {
        buttons: buttons,
        messageParamsJson: JSON.stringify({
          bottom_sheet: {
            list_title: "👁‍🗨 اختر اسم الشخصية",
            button_title: "✦ الخيارات"
          }
        })
      }
    };

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveMessage)
          }
        }
      },
      { userJid: conn.user.id, quoted: m }
    );

    await m.react("👁️");

    await conn.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id
    });

    conn.eren[id] = {
      correctAnswer: name,
      options: options,
      attempts: 2,
      timer: setTimeout(async () => {
        if (conn.eren[id]) {
          await conn.reply(m.chat, `✦ انتهى الوقت ⏰\n✦ الإجابة الصحيحة👁‍🗨: ${name}`, m);
          delete conn.eren[id];
        }
      }, timeout)
    };

  } catch (e) {
    console.error(e);
    await m.react("❌");
    conn.reply(m.chat, `✦ حدث خطأ أثناء بدء اللعبة ❌`, m);
  }
};

handler.help = ["عين"];
handler.tags = ["game"];
handler.command = /^(عين|عين_اللعبه|مجوب_\d+)$/i;

const EREN = {
  command: ["عين", "عين_اللعبه", "مجوب_1", "مجوب_2", "مجوب_3", "مجوب_4"],
  description: "لعبة خمن الشخصية من العين - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".عين",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS, command, usedPrefix }) {
  const text = args.join(' ');

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
