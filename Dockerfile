# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# RUN npm run build:dev && rm -rf /var/lib/apt/lists/*
# RUN npm run build

 
# Production Stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install PM2, system dependencies, and create a non-root user
RUN npm install -g pm2 && \
    apk add --no-cache shadow && \
    useradd -m nodeuser && chown -R nodeuser:nodeuser /app

# Copy the application files from the build stage
COPY --from=build /app /app

EXPOSE 8000

# Run the main execution file using pm2
CMD ["pm2", "start", "/app/build/src/server.js", "--no-daemon"]