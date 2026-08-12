import crypto from "crypto";

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export default generateOtp;