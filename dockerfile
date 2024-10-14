# 使用 Node 官方鏡像作為基礎鏡像
FROM node:18-bullseye as base

# 設置工作目錄
WORKDIR /app

# 安裝構建工具和所需庫
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# 安裝 tzdata 以便設置時區
RUN apt-get install -y tzdata

# 設置時區為亞洲/台北
RUN ln -sf /usr/share/zoneinfo/Asia/Taipei /etc/localtime && echo "Asia/Taipei" > /etc/timezone

# 拷貝 package.json 和 package-lock.json 文件
COPY package*.json ./

# 安裝項目依賴
RUN npm install

# 安裝全局的 forever 模組
RUN npm install -g forever

# 拷貝項目文件
COPY . .

# 設置環境變量文件
ARG ENV_FILE
COPY ${ENV_FILE} .env

# 暴露應用使用的端口
EXPOSE 4000

# 設置容器啟動時的命令
CMD ["node", "index.js"]
