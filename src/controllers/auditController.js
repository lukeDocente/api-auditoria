import { AuditManifest } from '../domain/auditManifest.js';
import { CryptoVerifier } from '../services/cryptoVerifier.js';
import { EvidenceValidator } from '../services/evidenceValidator.js';
import { ConfirmationCodeService } from '../services/confirmationCodeService.js';

export class AuditController {
  /**
   * Procesa la verificación completa de un manifiesto y opcionalmente los archivos binarios provistos.
   * Retorna el reporte de auditoría, estado de firma de cada ítem y el código de confirmación para el supervisor.
   */
  static verifyBatch({ manifestData, filesMap = {} }) {
    const manifest = AuditManifest.fromJSON(manifestData);
    const { confirmationCode, manifestHash } = ConfirmationCodeService.generateConfirmationCode(manifestData);

    let allSignaturesValid = true;
    let allHashesValid = true;
    const itemResults = [];

    for (const item of manifest.items) {
      const canonicalPayload = CryptoVerifier.buildCanonicalPayload({
        id: item.id,
        sha256: item.sha256,
        latitude: item.lat,
        longitude: item.lng,
        gpsTimeUtc: item.gps_time_utc,
        mockLocation: item.mock_location ?? false,
      });

      const isSignatureValid = CryptoVerifier.verifySignature({
        publicKeyBase64: manifest.devicePublicKey,
        canonicalPayload,
        signatureBase64: item.signature,
      });

      if (!isSignatureValid) {
        allSignaturesValid = false;
      }

      let fileHashCheck = null;
      if (filesMap[item.file]) {
        fileHashCheck = CryptoVerifier.verifyFileHash(filesMap[item.file], item.sha256);
        if (!fileHashCheck.isValid) {
          allHashesValid = false;
        }
      }

      const metaValidation = EvidenceValidator.validateItemMetadata(item);

      itemResults.push({
        id: item.id,
        file: item.file,
        isSignatureValid,
        fileHashCheck,
        metadataValidation: metaValidation,
      });
    }

    const overallVerified = allSignaturesValid && (Object.keys(filesMap).length === 0 || allHashesValid);

    return {
      status: overallVerified ? 'VERIFIED' : 'FAILED',
      confirmationCode,
      manifestHash,
      itemCount: manifest.items.length,
      allSignaturesValid,
      allHashesValid,
      items: itemResults,
      verifiedAt: new Date().toISOString(),
    };
  }
}

