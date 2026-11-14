export class EvidenceValidator {
  /**
   * Evalúa las políticas de integridad y antifraude del elemento de auditoría.
   */
  static validateItemMetadata(item) {
    const issues = [];
    const warnings = [];

    // 1. Coordenadas válidas
    if (typeof item.lat !== 'number' || item.lat < -90 || item.lat > 90) {
      issues.push(`Latitud fuera de rango o inválida: ${item.lat}`);
    }
    if (typeof item.lng !== 'number' || item.lng < -180 || item.lng > 180) {
      issues.push(`Longitud fuera de rango o inválida: ${item.lng}`);
    }

    // 2. Precisión GPS (RF-02 y RNF-03)
    if (typeof item.accuracy_m !== 'number' || item.accuracy_m < 0) {
      issues.push('Precisión GPS ausente o negativa');
    } else if (item.accuracy_m > 50) {
      warnings.push(`Precisión GPS degradada (±${item.accuracy_m} m > 50 m)`);
    }

    // 3. Antifraude: Ubicación simulada (Mock Location - SDD §11.2)
    if (item.mock_location === true) {
      warnings.push('ALERTA: Se detectó ubicación simulada (Mock Location)');
    }

    // 4. Timestamp GPS
    if (!item.gps_time_utc) {
      issues.push('Marca de tiempo GPS ausente');
    } else {
      const parsedDate = new Date(item.gps_time_utc);
      if (isNaN(parsedDate.getTime())) {
        issues.push(`Formato de fecha GPS inválido: ${item.gps_time_utc}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      isMocked: item.mock_location === true,
      hasLowAccuracy: (item.accuracy_m ?? 0) > 50,
    };
  }
}

