import express, { Request, Response, Router } from 'express';
import twilio from 'twilio';
const { VoiceResponse } = twilio.twiml;

const router: Router = express.Router();

router.post('/incoming', (req: Request, res: Response) => {
  const twiml = new VoiceResponse();
  const connect = twiml.connect();
  connect.stream({
    url: `wss://${req.headers.host}/media-stream`,
    track: 'inbound_track'
  });

  res.type('text/xml');
  res.send(twiml.toString());
});

export default router;
