export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  maxAccuracyThresholdMeters: 50.0,
  optimalAccuracyThresholdMeters: 20.0,
  supportedSchemaVersion: 1,
};

