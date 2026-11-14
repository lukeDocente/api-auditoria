import crypto from 'node:crypto';

export class CryptoVerifier {
  /**
   * Calcula el hash SHA-256 de un buffer binario.
   */
  static computeSha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Convierte una clave pública X.509 Base64 al formato PEM requerido por OpenSSL / Node crypto.
   */
  static convertBase64ToPem(base64Key) {
    const cleanKey = base64Key.replace(/[\r\n\s]/g, '');
    return `-----BEGIN PUBLIC KEY-----\n${cleanKey.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----\n`;
  }

  /**
   * Construye el payload canónico coincidente con el cliente Flutter/Android:
   * '$id|$sha256Hex|$latitude|$longitude|$gpsTimeUtc|$mockLocation'
   */
  static buildCanonicalPayload({
    id,
    sha256,
    latitude,
    longitude,
    gpsTimeUtc,
    mockLocation,
  }) {
    return `${id}|${sha256}|${latitude}|${longitude}|${gpsTimeUtc}|${mockLocation}`;
  }

  /**
   * Verifica la firma ECDSA P-256 (SHA256withECDSA) usando la clave pública provista.
   */
  static verifySignature({
    publicKeyBase64,
    canonicalPayload,
    signatureBase64,
  }) {
    try {
      const pemKey = this.convertBase64ToPem(publicKeyBase64);
      const signatureBuffer = Buffer.from(signatureBase64, 'base64');
      const dataBuffer = Buffer.from(canonicalPayload, 'utf8');

      const verify = crypto.createVerify('SHA256');
      verify.update(dataBuffer);
      verify.end();

      return verify.verify(pemKey, signatureBuffer);
    } catch (err) {
      return false;
    }
  }

  /**
   * Comprueba la integridad del archivo comparando su contenido real con el hash declarado.
   */
  static verifyFileHash(fileBuffer, declaredSha256) {
    const computed = this.computeSha256(fileBuffer);
    return {
      isValid: computed.toLowerCase() === declaredSha256.toLowerCase(),
      computedHash: computed,
    };
  }
}

