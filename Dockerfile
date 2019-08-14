FROM node:12

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm i

COPY ./* /

CMD node index.js