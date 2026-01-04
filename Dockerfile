FROM node:20-alpine

# Install dependencies for PDF processing
RUN apk add --no-cache python3 make g++ poppler-utils

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start"]
