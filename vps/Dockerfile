FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY init.sql ./
COPY migrations ./migrations
EXPOSE 9090
CMD ["node", "server.js"]
