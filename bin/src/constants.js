import path from 'path';
import userHome from 'user-home';

export const SETTINGS_FILE = '.lambdasyncrc';
export const AWS_USER_DIR = path.join(userHome, '.aws');
export const AWS_CREDENTIALS_PATH = path.join(AWS_USER_DIR, 'credentials');
export const AWS_CONFIG_PATH = path.join(AWS_USER_DIR, 'config');
export const LAMBDASYNC_ROOT = path.join(__dirname);
export const LAMBDASYNC_BIN = path.join(LAMBDASYNC_ROOT, 'node_modules', '.bin');
export const TARGET_ROOT = process.cwd();
