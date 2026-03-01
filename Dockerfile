# Usamos una imagen ligera de Node
FROM node:20-slim

# Instalamos las dependencias mínimas para que Chrome funcione en Linux
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Creamos el directorio de trabajo
WORKDIR /app

# Copiamos solo lo necesario y pre-instalamos puppeteer-core
COPY package.json .
RUN npm install puppeteer-core --only=production

# Copiamos nuestro script de escaneo
COPY scanner.js .

# Configuramos la variable para que Puppeteer sepa dónde está Chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Comando por defecto
ENTRYPOINT ["node", "scanner.js"]
