import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EvidenceValidator } from '../src/services/evidenceValidator.js';

describe('EvidenceValidator Service', () => {
  it('should pass valid evidence metadata', () => {
    const item = {
      lat: 14.634915,
      lng: -90.506882,
      accuracy_m: 8.0,
      gps_time_utc: '2026-11-13T19:30:00.000Z',
      mock_location: false,
    };

    const result = EvidenceValidator.validateItemMetadata(item);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.issues.length, 0);
    assert.strictEqual(result.isMocked, false);
    assert.strictEqual(result.hasLowAccuracy, false);
  });

  it('should flag mock location warning as antifraud measure', () => {
    const item = {
      lat: 14.634915,
      lng: -90.506882,
      accuracy_m: 10.0,
      gps_time_utc: '2026-11-13T19:30:00.000Z',
      mock_location: true, // Simulación detectada en Android
    };

    const result = EvidenceValidator.validateItemMetadata(item);
    assert.strictEqual(result.isMocked, true);
    assert.ok(result.warnings.some(w => w.includes('Mock Location')));
  });

  it('should flag degraded accuracy when > 50 meters', () => {
    const item = {
      lat: 14.634915,
      lng: -90.506882,
      accuracy_m: 75.0,
      gps_time_utc: '2026-11-13T19:30:00.000Z',
      mock_location: false,
    };

    const result = EvidenceValidator.validateItemMetadata(item);
    assert.strictEqual(result.hasLowAccuracy, true);
    assert.ok(result.warnings.some(w => w.includes('50 m')));
  });

  it('should reject invalid coordinate bounds', () => {
    const item = {
      lat: 95.0, // Inválido (> 90)
      lng: -200.0, // Inválido (< -180)
      accuracy_m: 5.0,
      gps_time_utc: '2026-11-13T19:30:00.000Z',
      mock_location: false,
    };

    const result = EvidenceValidator.validateItemMetadata(item);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.issues.length >= 2);
  });
});

