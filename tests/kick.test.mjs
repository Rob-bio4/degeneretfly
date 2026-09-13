import {it,expect} from 'vitest';
import {generateKeyPairSync,sign} from 'node:crypto';
import {authenticKick} from '../engine/kick.mjs';
it('verifies raw signed Kick messages and rejects tampering and stale replays',()=>{
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const stamp=new Date().toISOString(),raw=Buffer.from('{"content":"hello"}');
  const signature=sign('RSA-SHA256',Buffer.concat([Buffer.from(`event1.${stamp}.`),raw]),privateKey).toString('base64');
  const headers={'kick-event-message-id':'event1','kick-event-message-timestamp':stamp,'kick-event-signature':signature};
  expect(authenticKick(headers,raw,publicKey)).toBe(true);
  expect(authenticKick(headers,Buffer.from('{}'),publicKey)).toBe(false);
  expect(authenticKick(headers,raw,publicKey,Date.now()+600000)).toBe(false);
});
