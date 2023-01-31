const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const charValue = (char) => alphabet.indexOf(char.toUpperCase());

const fromBase32 = (b32) => {
  if (b32.length === 0) return 0;
  return charValue(b32.slice(-1)) + fromBase32(b32.slice(0, -1)) * 32;
};

const toBase32 = (n) => {
  const remainder = Math.floor(n / 32);
  const current = n % 32;
  if (remainder === 0) return alphabet[current];
  return `${toBase32(remainder)}${alphabet[current]}`;
};

module.exports = { fromBase32, toBase32 };
