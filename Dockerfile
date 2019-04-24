FROM node:lts-alpine
WORKDIR /app
RUN apk add --no-cache build-base python
ADD . .
RUN npm update
CMD ["node", "index.js"]
