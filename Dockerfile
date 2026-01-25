# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies for both frontend and backend
RUN npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build frontend with REST API enabled
ENV VITE_USE_REST_API=true
ENV VITE_API_URL=/api
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Install only production dependencies for server
WORKDIR /app/server
RUN npm install --only=production

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]