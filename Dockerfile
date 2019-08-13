FROM node:12

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm i

COPY index.js index.js
COPY configs/integrations.json integrations.json
COPY UriObjectUtils.js UriObjectUtils.js

CMD node index.js