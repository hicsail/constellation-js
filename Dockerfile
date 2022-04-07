FROM node:17.8.0
ENV NODE_ENV=production
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm install webpack-cli webpack -g

WORKDIR /

COPY ["webpack.config.js", "package.json", "package-lock.json*", "./"]
RUN npm update && npm install
COPY . .
CMD [ "npm", "run", "start" ]
