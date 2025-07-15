import { mulaw } from 'alawmulaw';

export const convertMulawToPCM = (mulawData: Buffer): Buffer => {
  const pcmData = mulaw.decode(mulawData);
  return Buffer.from(pcmData.buffer);
};
