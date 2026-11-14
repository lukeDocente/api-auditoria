import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { AuditController } from '../src/controllers/auditController.js';
import { CryptoVerifier } from '../src/services/cryptoVerifier.js';

describe('AuditController Batch Verification & Ingestion Workflow', () => {
  it('should successfully verify a complete batch and generate 8-character confirmation code', () => {
    // Generar par de claves EC P-256
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const fileContent = Buffer.from('Contenido binario simulado de foto JPEG auditada con EXIF y marca de agua');
    const computedSha256 = CryptoVerifier.computeSha256(fileContent);

    const canonicalPayload = CryptoVerifier.buildCanonicalPayload({
      id: '01HBJ5D7X0A7F3K2QD',
      sha256: computedSha256,
      latitude: 14.634915,
      longitude: -90.506882,
      gpsTimeUtc: '2026-11-13T19:30:00.000Z',
      mockLocation: false,
    });

    const signer = crypto.createSign('SHA256');
    signer.update(Buffer.from(canonicalPayload, 'utf8'));
    signer.end();
    const signatureBase64 = signer.sign(privateKey).toString('base64');

    const manifestData = {
      schema_version: 1,
      app_version: '1.0.0',
      exported_at: '2026-11-13T19:30:00-06:00',
      device_public_key: publicKey.toString('base64'),
      items: [
        {
          id: '01HBJ5D7X0A7F3K2QD',
          file: 'A7F3K2QD.jpg',
          sha256: computedSha256,
          signature: signatureBase64,
          lat: 14.634915,
          lng: -90.506882,
          accuracy_m: 8.0,
          gps_time_utc: '2026-11-13T19:30:00.000Z',
          mock_location: false,
        },
      ],
    };

    const filesMap = {
      'A7F3K2QD.jpg': fileContent,
    };

    const result = AuditController.verifyBatch({ manifestData, filesMap });

    assert.strictEqual(result.status, 'VERIFIED');
    assert.strictEqual(result.allSignaturesValid, true);
    assert.strictEqual(result.allHashesValid, true);
    assert.strictEqual(result.confirmationCode.length, 8);
    assert.strictEqual(result.itemCount, 1);
    assert.strictEqual(result.items[0].isSignatureValid, true);
    assert.strictEqual(result.items[0].fileHashCheck.isValid, true);
  });

  it('should detect altered image file (hash mismatch)', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const originalContent = Buffer.from('Original image bytes');
    const alteredContent = Buffer.from('Altered image bytes by unauthorized party');
    const originalHash = CryptoVerifier.computeSha256(originalContent);

    const canonicalPayload = CryptoVerifier.buildCanonicalPayload({
      id: '01HBJ5D7X0A7F3K2QD',
      sha256: originalHash,
      latitude: 14.634915,
      longitude: -90.506882,
      gpsTimeUtc: '2026-11-13T19:30:00.000Z',
      mockLocation: false,
    });

    const signer = crypto.createSign('SHA256');
    signer.update(Buffer.from(canonicalPayload, 'utf8'));
    signer.end();
    const signatureBase64 = signer.sign(privateKey).toString('base64');

    const manifestData = {
      schema_version: 1,
      app_version: '1.0.0',
      exported_at: '2026-11-13T19:30:00-06:00',
      device_public_key: publicKey.toString('base64'),
      items: [
        {
          id: '01HBJ5D7X0A7F3K2QD',
          file: 'A7F3K2QD.jpg',
          sha256: originalHash,
          signature: signatureBase64,
          lat: 14.634915,
          lng: -90.506882,
          accuracy_m: 8.0,
          gps_time_utc: '2026-11-13T19:30:00.000Z',
          mock_location: false,
        },
      ],
    };

    // Pasamos el archivo alterado
    const filesMap = {
      'A7F3K2QD.jpg': alteredContent,
    };

    const result = AuditController.verifyBatch({ manifestData, filesMap });

    assert.strictEqual(result.status, 'FAILED');
    assert.strictEqual(result.allHashesValid, false);
    assert.strictEqual(result.items[0].fileHashCheck.isValid, false);
  });
});
