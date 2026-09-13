# Small, production-ish image for the Node/Express frontend.
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY server.js ./
COPY public ./public

# The app listens on 8080 (see server.js / PORT env)
ENV PORT=8080
EXPOSE 8080

# Run as the built-in non-root "node" user for safety
USER node

CMD ["node", "server.js"]
