# Base image
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Install Python and other dependencies required for node-gyp
RUN apk add --no-cache python3 make g++ gcc

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install app dependencies
RUN yarn install

# Bundle app source
COPY . .

# Build application
RUN yarn build

# Remove development dependencies
RUN yarn install --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]


