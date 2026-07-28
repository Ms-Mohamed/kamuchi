FROM node:22-slim

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and prisma schema first for layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Provide dummy variables so Prisma doesn't crash during build's npm install
ENV DATABASE_URL="postgresql://dummy"
ENV DIRECT_URL="postgresql://dummy"

# Install all dependencies (including devDeps for prisma CLI)
# The postinstall script of @prisma/client will automatically run `prisma generate`
RUN npm install

# Copy the rest of the application
COPY . .

# Ensure runtime directories exist
RUN mkdir -p uploads prisma

# Set node environment
ENV NODE_ENV=production

EXPOSE 5000

# Startup is handled by docker-compose command to support volume-mounted schema
CMD ["node", "server.js"]
