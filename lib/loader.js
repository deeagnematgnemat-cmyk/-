import fs from "fs-extra";
import path from "path";
import { pathToFileURL } from "url";
import chalk from "chalk";
import { PLUGINS_DIR } from "./paths.js";

const colors = {
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  reset: "\x1b[0m"
};

const logger = {
  info: (...args) => console.log(colors.blue, ...args, colors.reset),
  success: (...args) => console.log(colors.green, ...args, colors.reset),
  warn: (...args) => console.log(colors.yellow, ...args, colors.reset),
  error: (...args) => console.log(colors.red, ...args, colors.reset)
};

let loadedPlugins = {};
let pluginIssues = [];

export function getPluginIssues() {
  return pluginIssues;
}


async function getAllJsFiles(dir) {
  let results = [];
  
  if (!await fs.pathExists(dir)) return results;

  const list = await fs.readdir(dir, { withFileTypes: true });

  for (const item of list) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      const subFiles = await getAllJsFiles(fullPath);
      results = results.concat(subFiles);
    } else if (item.isFile() && item.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }
  return results;
}



async function loadSinglePlugin(filePath, themeHex) {
  try {
    const fileUrl = pathToFileURL(filePath).href + `?update=${Date.now()}`;
    const module = await import(fileUrl);

    let handler = null;

    //@Eren/changes Support EREN format alongside legacy AIZEN
    const configObj = module.default?.EREN || module.default?.AIZEN || module.EREN || module.AIZEN;

    if (module.default && configObj && typeof module.default.execute === "function") {
      handler = { ...configObj, execute: module.default.execute };
    } else if (module.default && typeof module.default.execute === "function") {
      handler = module.default;
    } else if (configObj && typeof module.execute === "function") {
      handler = { ...configObj, execute: module.execute };
    } else if (typeof module.execute === "function") {
      handler = module;
    } else if (typeof module.default === "function") {
      const fn = module.default;
      let cmd = fn.command || fn.help;
      if (cmd instanceof RegExp || !cmd) {
        cmd = path.basename(filePath).replace(".js", "");
      }
      handler = {
        ...fn,
        command: cmd,
        description: fn.help ? (Array.isArray(fn.help) ? fn.help.join(', ') : fn.help) : '',
        execute: async ({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) => {
          const text = args.join(' ');
          const usedPrefix = '.';
          const cmdName = Array.isArray(cmd) ? cmd[0] : (typeof cmd === 'string' ? cmd : path.basename(filePath).replace(".js", ""));
          return fn(msg, {
            conn: sock,
            sock,
            text,
            args,
            usedPrefix,
            command: cmdName,
            isOwner,
            isROwner: isOwner,
            isPrems: isElite,
            sender: sender.pn,
            BIDS
          });
        }
      };
    }

    if (!handler || !handler.execute) {
      logger.warn(`⚠ Skipped (no execute): ${filePath}`);
      pluginIssues.push(`❌ Skipped: ${filePath}`);
      return;
    }

    handler.filePath = filePath;

    // Which numbers may run this command. Absent means "everywhere", so an MD
    // sub-bot behaves like a real bot; "off" pins the command to the main
    // number and is meant for plugins that mutate global state (settings,
    // reload, the MD installer itself).
    handler.md = handler.md === "off" ? "off" : "on";

    let commands = handler.command;

    if (!commands) {
      const fileName = path.basename(filePath).replace(".js", "");
      commands = [fileName];
      logger.info(`ℹ '${fileName}' ⬇️  NAME FILE IS THE COMMAND HERE UNTIL YOU FIX IT`);
    } else if (typeof commands === "string") {
      commands = [commands];
    } else if (!Array.isArray(commands)) {
      logger.warn(`⚠ Invalid command format in ${filePath}`);
      pluginIssues.push(`❌ Invalid command format: ${filePath}`);
      return;
    }

    for (const cmd of commands) {
      if (typeof cmd !== "string") continue;

      const key = cmd.toLowerCase().trim();
      loadedPlugins[key] = handler;
      
      
      console.log(chalk.hex(themeHex)(`🛸 Plugin loaded: ${key}`));
    }

  } catch (err) {
    logger.error(`❌ Failed to load plugin (${filePath}):`, err);
    pluginIssues.push(`❌ Failed loading: ${filePath}\n${String(err)}`);
  }
}



export async function loadPlugins(themeColor) {
  loadedPlugins = {};
  pluginIssues = [];


  let hexColor = themeColor || '#00FF00';
  if (!hexColor.startsWith('#')) hexColor = '#' + hexColor;

  const pluginsDir = PLUGINS_DIR;

  await fs.ensureDir(pluginsDir);

  const files = await getAllJsFiles(pluginsDir);

  for (const file of files) {
    
    await loadSinglePlugin(file, hexColor);
  }

  
  console.log(chalk.hex(hexColor)("🔌 All plugins loaded successfully"));
  
  return loadedPlugins;
}

export function getPlugins() {
  return loadedPlugins;
}

/** Is this command allowed to run on the given connection? */
export function runsOn(handler, conn) {
  if (!handler) return false;
  if (conn?.isMain) return true;
  return handler.md !== "off";
}
