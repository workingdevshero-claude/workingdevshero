FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install

# Copy source code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "start"]
