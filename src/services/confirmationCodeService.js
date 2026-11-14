import crypto from 'node:crypto';

export class ConfirmationCodeService {
  /**
   * Genera el hash canónico del manifiesto (SHA-256) y extrae los primeros 8 caracteres
   * como código de confirmación del lote recibido.
   */
  static generateConfirmationCode(manifestObj) {
    const rawString = typeof manifestObj === 'string'
      ? manifestObj
      : JSON.stringify(manifestObj);
    
    const hashHex = crypto.createHash('sha256').update(rawString, 'utf8').digest('hex');
    const confirmationCode = hashHex.substring(0, 8).toUpperCase();

    return {
      manifestHash: hashHex,
      confirmationCode,
    };
  }
}

