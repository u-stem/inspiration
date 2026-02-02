FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies (lockfile required)
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev"]
