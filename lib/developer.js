import chalk from "chalk";
import { db } from "jsonion";
import { DEVELOPER_FILE } from "./paths.js";

async function addDeveloper({ sock, ids }) {
  const devDB = new db(DEVELOPER_FILE);
  let result = { fail: [], success: [] };
  if (!ids || !sock)
    return console.log(chalk.red("should input ids or add sock"));

  for (const id of ids) {
    const is = {
      lid: id.endsWith("@lid"),
      jid: id.endsWith("@s.whatsapp.net"),
    };

    switch (true) {
      case is.lid:
        const lids = devDB.get("lids") || [];
        if (lids.includes(id)) {
          result.fail.push({
            id: id,
            type: "lid",
            error: "exist_already",
            success: false,
            action: "add",
          });
          continue;
        }
        devDB.pushToPath("lids", id);
        result.success.push({
          id: id,
          type: "lid",
          error: null,
          success: true,
          action: "add",
        });
        break;
      case is.jid:
        const jids = devDB.get("jids") || [];
        if (jids.includes(id)) {
          result.fail.push({
            id: id,
            type: "jid",
            error: "exist_already",
            success: false,
            action: "add",
          });
          continue;
        }
        const [info] = await sock.onWhatsApp(id);
        devDB.pushToPath("jids", id);

        const currentLids = devDB.get("lids") || [];
        if (info?.lid && !currentLids.includes(info.lid))
          devDB.pushToPath("lids", info.lid);
        const twice = devDB.get("twice") || {};
        if (info?.lid) {
          devDB.set("twice", {
            ...twice,
            [info.lid]: info.jid,
            [info.jid]: info.lid,
          });
        }
        result.success.push({
          id: id,
          type: "jid",
          error: null,
          success: true,
          action: "add",
        });
        break;
      default:
        continue;
    }
  }
  return result;
}

async function rmDeveloper({ sock, ids }) {
  const devDB = new db(DEVELOPER_FILE);
  let result = { fail: [], success: [] };
  if (!ids || !sock)
    return console.log(chalk.red("should input ids or add sock"));

  for (const id of ids) {
    const is = {
      lid: id.endsWith("@lid"),
      jid: id.endsWith("@s.whatsapp.net"),
    };

    switch (true) {
      case is.lid:
        const lids = devDB.get("lids") || [];
        if (!lids.includes(id)) {
          result.fail.push({
            id: id,
            type: "lid",
            error: "not_exist",
            success: false,
            action: "remove",
          });
          continue;
        }
        const twice1 = devDB.get("twice") || {};
        const jids1 = devDB.get("jids") || [];
        devDB.set(
          "lids",
          lids.filter((l) => l !== id)
        );
        if (twice1[id]) {
          devDB.set(
            "jids",
            jids1.filter((j) => j !== twice1[id])
          );
          delete twice1[twice1[id]];
          delete twice1[id];
          devDB.set("twice", twice1);
        }

        result.success.push({
          id: id,
          type: "lid",
          error: null,
          success: true,
          action: "remove",
        });
        break;

      case is.jid:
        const [info] = await sock.onWhatsApp(id);
        const jids = devDB.get("jids") || [];
        const lids1 = devDB.get("lids") || [];
        const twice = devDB.get("twice") || {};
        if (!jids.includes(id) && (!info?.lid || !lids1.includes(info.lid))) {
          result.fail.push({
            id: id,
            type: "jid",
            error: "not_exist",
            success: false,
            action: "remove",
          });
          continue;
        }
        if (jids.includes(id))
          devDB.set(
            "jids",
            jids.filter((j) => j !== id)
          );
        if (info?.lid && lids1.includes(info.lid))
          devDB.set(
            "lids",
            lids1.filter((l) => l !== info.lid)
          );

        if (twice[id]) delete twice[id];
        if (info?.lid && twice[info.lid]) delete twice[info.lid];

        devDB.set("twice", twice);
        result.success.push({
          id: id,
          type: "jid",
          error: null,
          success: true,
          action: "remove",
        });
        break;
      default:
        continue;
    }
  }
  return result;
}

async function isDeveloper({ sock, id }) {
  const devDB = new db(DEVELOPER_FILE);
  const is = {
    lid: id.endsWith("@lid"),
    jid: id.endsWith("@s.whatsapp.net"),
  };

  const jids = devDB.get("jids") || [];
  const lids = devDB.get("lids") || [];
  const twice = devDB.get("twice") || {};
  if (is.jid) {
    if (jids.includes(id)) return true;
    try {
      const [info] = await sock.onWhatsApp(id);
      if (info?.lid && lids.includes(info.lid)) {
        devDB.pushToPath("jids", id);
        devDB.set("twice", {
          ...twice,
          [info.jid]: info.lid,
          [info.lid]: info.jid,
        });
        return true;
      }
    } catch {}
  }
  if (is.lid) {
    return lids.includes(id);
  }
  return false;
}

function getDevelopers() {
  const devDB = new db(DEVELOPER_FILE);
  const jids = devDB.get("jids") || [];
  const lids = devDB.get("lids") || [];
  const all = [...new Set([...jids, ...lids])];
  return all.length > 0 ? all : null;
}

async function developerReset({ sock } = {}) {
  const devDB = new db(DEVELOPER_FILE);
  if (!sock) {
    console.log(chalk.red("❌ Error: sock is required for developerReset"));
    devDB.set("lids", []);
    devDB.set("jids", []);
    devDB.set("twice", {});
    return true;
  }

  const botJid = sock.user?.id ? (sock.user.id.split(':')[0] + "@s.whatsapp.net") : null;
  const jids = devDB.get("jids") || [];
  const twice = devDB.get("twice") || {};

  if (botJid && jids.includes(botJid)) {
    console.log(chalk.green(`Developer Reset: Keeping Bot (${botJid}) in Developer.`));
    const botLid = twice[botJid];
    devDB.set("jids", [botJid]);
    if (botLid) {
      devDB.set("lids", [botLid]);
      devDB.set("twice", {
        [botJid]: botLid,
        [botLid]: botJid,
      });
    } else {
      devDB.set("lids", []);
      devDB.set("twice", {});
    }
  } else {
    console.log(chalk.yellow(`Developer Reset: Bot not found, clearing all.`));
    devDB.set("lids", []);
    devDB.set("jids", []);
    devDB.set("twice", {});
  }
  return true;
}

const developerPro = {
  addDeveloper,
  rmDeveloper,
  isDeveloper,
  getDevelopers,
  developerReset,
  // devolper aliases for spelling compatibility
  addDevolper: addDeveloper,
  rmDevolper: rmDeveloper,
  isDevolper: isDeveloper,
  getDevolpers: getDevelopers,
  devolperReset: developerReset,
};

export default developerPro;
