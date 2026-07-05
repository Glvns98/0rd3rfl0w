# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy the root package.json
COPY package.json ./

# Copy the frontend and backend folders
COPY frontend ./frontend
COPY backend ./backend

# Install dependencies for both and build the React frontend
RUN npm install

# Hugging Face Spaces default port is 7860. We'll set it globally.
ENV PORT=7860
EXPOSE 7860

# Start the unified Node.js server
CMD ["npm", "start"]
