/**
 * Modelo de datos del manifiesto de auditoría recibido (SDD §7)
 */
export class AuditManifest {
  constructor({
    schema_version = 1,
    app_version,
    exported_at,
    device_public_key,
    items = [],
  }) {
    this.schemaVersion = schema_version;
    this.appVersion = app_version;
    this.exportedAt = exported_at;
    this.devicePublicKey = device_public_key;
    this.items = items;
  }

  static fromJSON(json) {
    if (!json || typeof json !== 'object') {
      throw new Error('Formato de manifiesto inválido (debe ser un objeto JSON)');
    }
    if (json.schema_version !== 1) {
      throw new Error(`Versión de esquema no soportada: ${json.schema_version}. Se requiere versión 1.`);
    }
    if (!json.device_public_key) {
      throw new Error('Falta la clave pública del dispositivo (device_public_key)');
    }
    if (!Array.isArray(json.items) || json.items.length === 0) {
      throw new Error('El manifiesto debe incluir al menos un elemento en "items"');
    }

    return new AuditManifest(json);
  }
}

