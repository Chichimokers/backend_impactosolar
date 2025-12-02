FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

COPY . .

# Set environment to production
ENV NODE_ENV=production

EXPOSE 5500

CMD ["node", "app.js"]
