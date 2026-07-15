FROM node:20-slim

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install all dependencies (including devDeps for prisma CLI)
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Ensure runtime directories exist
RUN mkdir -p uploads prisma

# Set node environment
ENV NODE_ENV=production

EXPOSE 5000

# Startup is handled by docker-compose command to support volume-mounted schema
CMD ["node", "server.js"]
