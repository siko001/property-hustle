export function makeCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values =
    typeof crypto !== 'undefined' ? crypto.getRandomValues(new Uint8Array(length)) : undefined;

  return Array.from({ length }, (_, index) => {
    const value = values ? values[index] : Math.floor(Math.random() * alphabet.length);
    return alphabet[value % alphabet.length];
  }).join('');
}

export function makeSecretKey() {
  return `${makeCode(4)}-${makeCode(4)}-${makeCode(4)}`;
}

export function getOrCreateClientId() {
  const storageKey = 'property-hustle-client-id';
  const persistentId = window.localStorage.getItem(storageKey);
  if (persistentId) return persistentId;

  const previousSessionId = window.sessionStorage.getItem(storageKey);
  if (previousSessionId) {
    window.localStorage.setItem(storageKey, previousSessionId);
    return previousSessionId;
  }

  const clientId = `player-${makeCode(12).toLowerCase()}`;
  window.localStorage.setItem(storageKey, clientId);
  return clientId;
}
