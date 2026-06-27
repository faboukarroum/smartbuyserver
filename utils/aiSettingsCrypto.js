const crypto = require('crypto');

const getEncryptionKey = () => {
  const rawKey = process.env.AI_SETTINGS_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error('AI_SETTINGS_ENCRYPTION_KEY is required to save or use AI API keys');
  }

  return crypto.createHash('sha256').update(rawKey).digest();
};

const encryptSecret = (value) => {
  if (!value) {
    return '';
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
};

const decryptSecret = (value) => {
  if (!value) {
    return '';
  }

  const [ivHex, tagHex, encryptedHex] = value.split(':');

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Stored AI API key cannot be decrypted');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
};

module.exports = {
  encryptSecret,
  decryptSecret,
};
