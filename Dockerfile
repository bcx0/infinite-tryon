FROM node:18-alpine
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci && npm cache clean --force

COPY . .

RUN npm run build
RUN npx prisma generate
RUN chmod +x ./start.sh

EXPOSE 8080

CMD ["./start.sh"]
