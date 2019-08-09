FROM node:12

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm i

COPY index.js index.js
COPY integrations.json integrations.json

CMD node index.js