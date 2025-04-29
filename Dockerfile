# Use the official Node.js 18 LTS image for the build environment
FROM node:18-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package.json package-lock.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Use a smaller Node.js image for the runtime environment
FROM node:18-alpine AS release

# Set the working directory in the container
WORKDIR /app

# Copy the build output and necessary files from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Install only production dependencies
RUN npm ci --omit=dev

# Expose the desired port (if the application listens on a port, otherwise omit this)
# EXPOSE 3000

# Run the application
ENTRYPOINT ["node", "build/index.js"]