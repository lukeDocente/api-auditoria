# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

WORKDIR /app

# Definir variables de entorno de producción
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=10000

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias si las hubiera (en producción)
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev

# Copiar el código fuente
COPY src/ ./src/

# Usuario no privilegiado por seguridad
USER node

# Exponer el puerto
EXPOSE 10000

# Health check interno para el contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:10000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]

