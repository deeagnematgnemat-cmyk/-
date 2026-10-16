//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

import cp, {exec as _exec} from 'child_process';
import {promisify} from 'util';

const exec = promisify(_exec).bind(cp);

// تعريف رقم المطور ورقم حساب البوت الرسمي
const EREN_INFO = {
    ownerNumber: "رقم_المطور_هنا", // ضع رقم المطور هنا
    botNumber: "رقم_البوت_هنا"      // ضع رقم حساب البوت هنا
};

const handler = async (m, {conn, isOwner, command, text, usedPrefix, args, isROwner}) => {
  if (!isROwner) return;
  if (global.conn?.user?.id != conn.user?.id) return;
  m.reply('🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n*[❗] جاري التنفيذ...*');
  let o;
  try {
    o = await exec(command.trimStart() + ' ' + text.trimEnd());
  } catch (e) {
    o = e;
  } finally {
    const {stdout, stderr} = o;
    if (stdout.trim()) m.reply(stdout);
    if (stderr.trim()) m.reply(stderr);
  }
};

handler.customPrefix = /^[$]/;
handler.command = new RegExp;
handler.owner = true; 

const EREN = {
  command: ["$","exec"],
  description: "تنفيذ أوامر النظام (المطور) - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".$",
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
  const command = "$";
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
