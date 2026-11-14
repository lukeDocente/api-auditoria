import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { CryptoVerifier } from '../src/services/cryptoVerifier.js';

describe('CryptoVerifier Service', () => {
  it('should compute correct SHA-256 hash', () => {
    const data = Buffer.from('Auditoria Fotográfica Test File', 'utf8');
    const expected = crypto.createHash('sha256').update(data).digest('hex');
    const actual = CryptoVerifier.computeSha256(data);
    assert.strictEqual(actual, expected);
  });

  it('should verify valid ECDSA P-256 signature generated with hardware key format', () => {
    // Generar par de claves EC P-256 (igual que Android Keystore)
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1', // NIST P-256
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const publicKeyBase64 = publicKey.toString('base64');
    const canonicalPayload = CryptoVerifier.buildCanonicalPayload({
      id: '01HBJ5D7X0A7F3K2QD',
      sha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
      latitude: 14.634915,
      longitude: -90.506882,
      gpsTimeUtc: 1731547245000,
      mockLocation: false,
    });

    // Firmar con la clave privada
    const signer = crypto.createSign('SHA256');
    signer.update(Buffer.from(canonicalPayload, 'utf8'));
    signer.end();
    const signatureBase64 = signer.sign(privateKey).toString('base64');

    // Verificar usando el verificador de backend
    const isValid = CryptoVerifier.verifySignature({
      publicKeyBase64,
      canonicalPayload,
      signatureBase64,
    });

    assert.strictEqual(isValid, true, 'La firma ECDSA válida debe verificarse exitosamente');
  });

  it('should reject tampered payload or altered coordinates', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const publicKeyBase64 = publicKey.toString('base64');
    const originalPayload = CryptoVerifier.buildCanonicalPayload({
      id: '01HBJ5D7X0A7F3K2QD',
      sha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
      latitude: 14.634915,
      longitude: -90.506882,
      gpsTimeUtc: 1731547245000,
      mockLocation: false,
    });

    const signer = crypto.createSign('SHA256');
    signer.update(Buffer.from(originalPayload, 'utf8'));
    signer.end();
    const signatureBase64 = signer.sign(privateKey).toString('base64');

    // Modificar coordenadas simulando alteración maliciosa en tránsito
    const tamperedPayload = CryptoVerifier.buildCanonicalPayload({
      id: '01HBJ5D7X0A7F3K2QD',
      sha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
      latitude: 14.999999, // Coordenada alterada
      longitude: -90.506882,
      gpsTimeUtc: 1731547245000,
      mockLocation: false,
    });

    const isValid = CryptoVerifier.verifySignature({
      publicKeyBase64,
      canonicalPayload: tamperedPayload,
      signatureBase64,
    });

    assert.strictEqual(isValid, false, 'Una firma con payload alterado debe ser rechazada');
  });
});

