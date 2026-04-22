# Backend Dockerfile — Node.js + Express
FROM node:20-alpine

WORKDIR /app

# Install dependencies first so they are cached across code changes
COPY package*.json ./
RUN npm install --omit=dev

# Copy application code
COPY src ./src

# Run as a non-root user for safety
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000
CMD ["node", "src/server.js"]
