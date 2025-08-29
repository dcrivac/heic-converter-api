# ---- Build layer (node + libvips) ----
FROM node:20-alpine AS builder
RUN apk add --no-cache vips vips-dev gcc g++ make python3

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# ---- Runtime layer ----
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app /app

EXPOSE 8080
CMD ["node", "server.js"]
