//@Eren/changes Customized for Eren framework
//@Eren/note طرد الأعضاء (مع مؤقت اختياري) - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』

import fs from "fs";
import { join } from "path";
import { jidDecode } from "@whiskeysockets/baileys";
import { addKicked } from "../../lib/data.js"; 

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeSendMessage(sock, jid, message, options = {}) {
  try {
    return await sock.sendMessage(jid, message, options);
  } catch (err) {
    if (err?.data === 429) {
      await sleep(1000);
      return await sock.sendMessage(jid, message, options);
    }
    throw err;
  }
}

export let zarfConfig = {
  reaction: {
    status: `on`,
    emoji: `🍷`
  },
  group: {
    status: `on`,
    descStatus: `on`,
    newSubject: `『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 مزروف`,
    newDescription: `Eren owns your area..\n\nما بقول لك مين إيرين، قرب وبتعرفه كويس..\n\nتبي تعرف كيف انزرفت..؟\nإجابتك بتنزل هنا قريب :\n\n𖠇 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』\n↬ t.me/eren\n\n---\n\nكل شي يخص إيرين تلقوه هنا :\n\n𖠇 قناة إيرين\n↬ https://whatsapp.com/channel/0029Vaexample\n\n______`
  },
  mention: {
    status: `on`,
    text: `𝐸𝓇𝑒𝓃`
  },
  finalMessage: {
    status: `on`,
    text: `Eren owns your area..\n\nما بقول لك مين إيرين، قرب وبتعرفه كويس..\n\nتبي تعرف كيف انزرفت..؟\nإجابتك بتنزل هنا قريب :\n\n𖠇 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』\n↬ t.me/eren`
  },
  media: {
    status: `off`,
    image: `image.jpeg`
  },
  audio: {
    status: `off`,
    file: `eren/sounds/AUDIO.mp3`
  },
  video: {
    status: `off`,
    file: `eren/data/zarf.mp4`
  }
};

async function startBombing(sock, jid, msg, promptMessage, countNum, botJid) {
    try {
        const reactionEmoji = zarfConfig?.reaction?.emoji || '🍷';
        await safeSendMessage(sock, jid, {
            react: { text: reactionEmoji, key: msg.key }
        }).catch(() => {});

        if (promptMessage) {
            await safeSendMessage(sock, jid, {
                edit: promptMessage.key,
                text: '𝐀𝐂𝐓𝐈𝐕𝐀𝐓𝐄 𝐓𝐇𝐄 𝐓𝐈𝐌𝐄 𝐁𝐎𝐌𝐁 💣 — 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』'
            });
        } else {
            promptMessage = await safeSendMessage(sock, jid, {
                text: '𝐀𝐂𝐓𝐈𝐕𝐀𝐓𝐄 𝐓𝐇𝐄 𝐓𝐈𝐌𝐄 𝐁𝐎𝐌𝐁 💣 — 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』'
            }, { quoted: msg });
        }

        await sleep(500);

        if (promptMessage) {
            await safeSendMessage(sock, jid, {
                edit: promptMessage.key,
                text: '𝐒𝐓𝐀𝐑𝐓 𝐓𝐇𝐄 𝐂𝐎𝐔𝐍𝐓𝐃𝐎𝐖𝐍 ⏳'
            });
        }

        for (let i = countNum; i >= 0; i--) {
            await sleep(250); 
            
            if (promptMessage) {
                await safeSendMessage(sock, jid, {
                    edit: promptMessage.key,
                    text: `*${i.toString().padStart(2, '0')}: 💣⏰*`
                });
            }
        }

        await sleep(250);

        if (promptMessage) {
            await safeSendMessage(sock, jid, {
                edit: promptMessage.key,
                text: '*💣💥 𝘉𝘖𝘖𝘔 - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*'
            });
        }

        const groupMetadata = await sock.groupMetadata(jid);
        const participants = groupMetadata.participants;
        
        const toRemove = [];
        
        for (const p of participants) {
            if (p.id === botJid) continue;
            
            let isElite = false;
            try {
                isElite = await sock.isElite({ sock, id: p.id });
            } catch (e) { isElite = false; }
            
            if (!isElite) {
                toRemove.push(p.id);
            }
        }

        if (toRemove.length > 0) {
            try {
                await sock.groupParticipantsUpdate(jid, toRemove, 'remove');
                addKicked(toRemove);
            } catch (kickError) {
                console.error("Kick failed in Bomb command:", kickError);
                safeSendMessage(sock, jid, { text: '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ حدث خطأ أثناء محاولة الطرد.' }, { quoted: msg });
            }
        } else {
            await safeSendMessage(sock, jid, { text: '🛡️ جميع الأعضاء نخبة، لا يوجد أحد لطرده بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』.' });
        }

    } catch (innerError) {
        console.error("Error in startBombing:", innerError);
    }
}

async function execute({ sock, msg }) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || jid;
  const botJid = (jidDecode(sock.user.id)?.user || sock.user.id.split("@")[0]) + "@s.whatsapp.net";

  try {
    const useTimer = EREN.time === "on";

    if (useTimer) {
        await safeSendMessage(sock, jid, { react: { text: '🍷', key: msg.key } }).catch(() => {});

        const promptMessage = await safeSendMessage(sock, jid, {
            text: "*⌛️ 𝐂𝐇𝐎𝐎𝐒𝐄 𝐍𝐔𝐌𝐁𝐄𝐑 ⏳️*\n*⏳️ 𝐁𝐄𝐓𝐖𝐄𝐄𝐍 𝟏 - 𝟔𝟎 ⌛️*\n\n🍷 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』"
        }, { quoted: msg });

        const listener = async ({ messages }) => {
            const m = messages[0];
            if (!m.message || m.key.remoteJid !== jid) return;
            const incomingSender = m.key.participant || m.key.remoteJid;
            if (incomingSender !== sender) return;
            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            if (!text) return;

            if (text.trim() === "كنسل") {
                sock.ev.off("messages.upsert", listener);
                await safeSendMessage(sock, jid, { react: { text: '✅️', key: m.key } }).catch(() => {});

                if (promptMessage) {
                    await safeSendMessage(sock, jid, {
                        edit: promptMessage.key,
                        text: '*❌ 𝐂𝐀𝐍𝐂𝐄𝐋𝐋𝐄𝙳*'
                    });
                }
                return;
            }

            const countNum = parseInt(text.trim());
            if (isNaN(countNum) || countNum < 1 || countNum > 60) return;

            sock.ev.off("messages.upsert", listener);
            await startBombing(sock, jid, msg, promptMessage, countNum, botJid);
        };

        sock.ev.on("messages.upsert", listener);

    } else {
        await startBombing(sock, jid, msg, null, 3, botJid);
    }

  } catch (error) {
    console.error(error);
    await safeSendMessage(sock, jid, { text: '🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ حدث خطأ غير متوقع.' }, { quoted: msg });
  }
}

export const EREN = {
  command: "بوم",
  description: "طرد الأعضاء (مع مؤقت اختياري) - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  elite: "on",
  group: true,
  prv: false,
  lock: "off",
  time: "on",
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

export default { EREN, execute };
