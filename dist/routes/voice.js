"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const twilio_1 = __importDefault(require("twilio"));
const { VoiceResponse } = twilio_1.default.twiml;
const router = express_1.default.Router();
router.post('/incoming', (req, res) => {
    const twiml = new VoiceResponse();
    const connect = twiml.connect();
    connect.stream({
        url: `wss://${req.headers.host}/media-stream`,
        track: 'inbound_track'
    });
    res.type('text/xml');
    res.send(twiml.toString());
});
exports.default = router;
