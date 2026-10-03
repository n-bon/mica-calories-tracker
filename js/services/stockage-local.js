const CLE_CONFIG = 'mica.config';

export function lireConfig() {
  try {
    const brut = localStorage.getItem(CLE_CONFIG);
    if (!brut) return null;
    const config = JSON.parse(brut);
    return {
      url: typeof config.url === 'string' ? config.url : '',
      clePublishable: typeof config.clePublishable === 'string' ? config.clePublishable : '',
      email: typeof config.email === 'string' ? config.email : '',
    };
  } catch {
    return null;
  }
}

// Seuls l'URL, la clé publishable et l'email sont écrits : jamais le mot de passe.
export function ecrireConfig({ url, clePublishable, email }) {
  localStorage.setItem(CLE_CONFIG, JSON.stringify({ url, clePublishable, email }));
}
