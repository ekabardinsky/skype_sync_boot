FROM node:12

COPY index.js index.js
COPY integrations.json integrations.json
COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm i

CMD node index.js