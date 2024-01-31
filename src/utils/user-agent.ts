import parser from "ua-parser-js";

export async function uaChecker(storedUA: string | null, clientUA: string) {
  if (storedUA === null) {
    // When no stored ua
    return null;
  }
  if (clientUA === storedUA) {
    return true;
  }
  if (uaComparator(clientUA, storedUA)) {
    return true;
  }
  return false;
}

function uaComparator(clientUA: string, storedUA: string) {
  const parsedClientUA = parser(clientUA);
  const parsedStoredUA = parser(storedUA);

  if (parsedClientUA.browser.name !== parsedStoredUA.browser.name) {
    return false;
  }
  if (
    !parsedClientUA.browser.version ||
    (parsedStoredUA.browser.version &&
      parsedClientUA.browser.version < parsedStoredUA.browser.version)
  ) {
    return false;
  }
  if (
    !parsedClientUA.engine.name ||
    parsedClientUA.engine.name !== parsedStoredUA.engine.name
  ) {
    return false;
  }
  if (
    !parsedClientUA.engine.version ||
    (parsedStoredUA.engine.version &&
      parsedClientUA.engine.version < parsedStoredUA.engine.version)
  ) {
    return false;
  }
  if (
    !parsedClientUA.os.name ||
    parsedClientUA.os.name !== parsedStoredUA.os.name
  ) {
    return false;
  }
  if (parsedClientUA.os.version === undefined) {
    return false;
  }
  if (parsedClientUA.device.model !== parsedStoredUA.device.model) {
    return false;
  }
  if (parsedClientUA.device.type !== parsedStoredUA.device.type) {
    return false;
  }
  if (parsedClientUA.device.vendor !== parsedStoredUA.device.vendor) {
    return false;
  }
  if (
    parsedClientUA.cpu.architecture === undefined ||
    parsedClientUA.cpu.architecture !== parsedStoredUA.cpu.architecture
  ) {
    return false;
  }
  return true;
}
