"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMulawToPCM = void 0;
const alawmulaw_1 = require("alawmulaw");
const convertMulawToPCM = (mulawData) => {
    const pcmData = alawmulaw_1.mulaw.decode(mulawData);
    return Buffer.from(pcmData.buffer);
};
exports.convertMulawToPCM = convertMulawToPCM;
