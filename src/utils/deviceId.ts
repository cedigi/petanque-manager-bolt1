const KEY = 'pm_device_id_v1';

function randomId(len=32) {
  const chars = 'abcdef0123456789';
  let s = '';
  for (let i=0;i<len;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = randomId(40);
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return 'mem-' + randomId(40);
  }
}
