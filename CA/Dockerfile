FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node 

RUN npm i 

COPY --chown=node:node . .

EXPOSE 3000

CMD ["node", "index.js"]




# Use an official Node.js runtime as the base image
FROM node:16

# Create and change to the app directory
WORKDIR /home/node/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
