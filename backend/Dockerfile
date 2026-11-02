# Multi-stage lean Dockerfile for PayBuddy Express Backend
FROM node:22-alpine AS production

# Set working directory
WORKDIR /usr/src/app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy application source
COPY . .

# Use non-root node user for container security
USER node

# Expose API port
EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server.js"]
