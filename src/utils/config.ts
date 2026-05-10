import { ConfigModel } from '../schemas/config.js';

export async function getConfigOrNull(name: string) {
  try {
    return await ConfigModel.findOne({ name });
  } catch {
    return null;
  }
}

export async function getConfig(name: string, defaultValue?: any) {
  const config = await getConfigOrNull(name);
  if (!config) return defaultValue ?? null;
  return config.value;
}

export async function setConfig(name: string, value: any) {
  let config = await getConfigOrNull(name);
  if (!config) {
    config = await ConfigModel.create({ name, value });
  } else {
    config.value = value;
    await config.save();
  }
  return config;
}

export async function deleteConfig(name: string) {
  try {
    const result = await ConfigModel.deleteOne({ name });
    return result.deletedCount > 0;
  } catch {
    return false;
  }
}

export async function getAllConfigs() {
  try {
    return await ConfigModel.find({});
  } catch {
    return [];
  }
}

export async function configExists(name: string): Promise<boolean> {
  const config = await getConfigOrNull(name);
  return !!config;
}

export default {
  getConfigOrNull,
  getConfig,
  setConfig,
  deleteConfig,
  getAllConfigs,
  configExists,
};
