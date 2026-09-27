import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const passwordService = {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  },

  async verify(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  },
};
