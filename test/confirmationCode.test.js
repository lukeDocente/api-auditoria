import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ConfirmationCodeService } from '../src/services/confirmationCodeService.js';

describe('ConfirmationCodeService', () => {
  it('should generate an 8-character uppercase hex confirmation code matching manifest hash prefix', () => {
    const manifest = {
      schema_version: 1,
      app_version: '1.0.0',
      exported_at: '2026-11-13T19:30:00-06:00',
      device_public_key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
      items: [
        {
          id: '01HBJ5D7X0A7F3K2QD',
          file: 'A7F3K2QD.jpg',
          sha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
          signature: 'MEQCID...',
          lat: 14.634915,
          lng: -90.506882,
          accuracy_m: 8.0,
          gps_time_utc: '2026-11-13T19:30:00Z',
          mock_location: false,
        },
      ],
    };

    const { confirmationCode, manifestHash } = ConfirmationCodeService.generateConfirmationCode(manifest);

    assert.strictEqual(confirmationCode.length, 8);
    assert.match(confirmationCode, /^[A-F0-9]{8}$/);
    assert.strictEqual(manifestHash.substring(0, 8).toUpperCase(), confirmationCode);
  });
});

