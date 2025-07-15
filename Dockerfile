# base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# copy package.json and package-lock.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Start the application in development mode
CMD ["npm", "run", "start:dev"]
