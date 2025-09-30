# Development Dockerfile with hot reload
FROM node:22.18.0-bookworm

# Set working directory
WORKDIR /app

# Install dependencies for development
RUN apt install curl

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_APP_TITLE
ARG VITE_APP_ENV


# Set environment variables
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_TITLE=${VITE_APP_TITLE}
ENV VITE_APP_ENV=${VITE_APP_ENV}

# Expose port 80 for the container
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Start development server with hot reload
CMD npm run dev -- --host 0.0.0.0 --port 80