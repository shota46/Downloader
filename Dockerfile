FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Install consumet-api dependencies
WORKDIR /app/consumet-api
RUN npm install --legacy-peer-deps

# Install anime-vault dependencies
WORKDIR /app/anime-vault/server
RUN npm install

# Back to app root
WORKDIR /app

# Create downloads directories
RUN mkdir -p downloads/youtube downloads/anime

# Environment variables
ENV FLASK_HOST=0.0.0.0
ENV CONSUMET_API=http://localhost:3000
ENV YTDL_API=http://localhost:8765
ENV ANIMEVAULT_API=http://localhost:4040
ENV PORT=8080

# Start script
COPY render-start.sh .
RUN chmod +x render-start.sh

EXPOSE 8080

CMD ["./render-start.sh"]
