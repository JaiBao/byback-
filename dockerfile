# 使用 Node 官方镜像作为基础镜像
FROM node:18-bullseye as base

# 设置工作目录
WORKDIR /app

# 安装构建工具和所需库
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# 拷贝 package.json 和 package-lock.json 文件
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 安装全局的 forever 模块
RUN npm install -g forever

# 拷贝项目文件
COPY . .

# 设置环境变量文件
ARG ENV_FILE
COPY ${ENV_FILE} .env

# 暴露端口
EXPOSE 4000

# 设置容器启动时的命令
CMD ["node", "index.js"]
