import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Every filesystem location the bot uses, resolved from this file's own
 * position instead of `process.cwd()`.
 *
 * The old multi-account build called `process.chdir(TARGET_FOLDER)` at boot and
 * let plugins address their resources with `process.cwd()`-relative paths. With
 * a single bot at the repo root there is no chdir, so the bot keeps working no
 * matter which directory node was launched from.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repository root — the directory holding index.js, main.js and config.js. */
export const ROOT = resolve(__dirname, '..');

export const LIB_DIR = join(ROOT, 'lib');
export const CONFIG_FILE = join(ROOT, 'config.js');

/** Command plugins, one sub-directory per category. */
export const PLUGINS_DIR = join(ROOT, 'plugins');

/** Mutable state: history log, elite list, kicked-member records. */
export const DATA_DIR = join(ROOT, 'data');
export const HISTORY_FILE = join(DATA_DIR, 'History.txt');
export const ELITE_FILE = join(DATA_DIR, 'elite.json');
export const DEVELOPER_FILE = join(DATA_DIR, 'developer.json');

/** Static assets shipped with the bot. */
export const MEDIA_DIR = join(ROOT, 'media');
export const IMAGE_FILE = join(MEDIA_DIR, 'image.jpeg');
export const LOGO_FILE = join(MEDIA_DIR, 'Logo_Eren.png');
export const SOUNDS_DIR = join(MEDIA_DIR, 'sounds');
export const THEMES_DIR = join(MEDIA_DIR, 'themes');
export const THEME_SETTINGS_FILE = join(THEMES_DIR, 'settings.txt');
export const SOUND_STATE_FILE = join(THEMES_DIR, 'soundState.txt');

/** Baileys auth state for the main number, paired from the terminal. */
export const SESSION_DIR = join(ROOT, 'session');

/** One sub-directory per MD sub-bot, named after its phone number. */
export const MD_SESSIONS_DIR = join(ROOT, 'md_sessions');

/** Auth folder for a single MD sub-bot. */
export const mdSessionDir = (number) => join(MD_SESSIONS_DIR, String(number));
