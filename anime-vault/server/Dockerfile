FROM node:20-alpine

RUN apk add --no-cache ffmpeg openssh-client

WORKDIR /app
COPY package.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /data/anime

EXPOSE 4040
CMD ["node", "index.js"]
