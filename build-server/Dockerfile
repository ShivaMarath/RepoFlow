FROM ubuntu:focal
RUN apt-get update
RUN apt-get install -y curl dos2unix
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install git -y
WORKDIR /home/app
COPY main.sh main.sh
COPY script.js script.js
RUN npm install @aws-sdk/client-s3 mime-types dotenv
RUN dos2unix main.sh
RUN chmod +x main.sh
ENTRYPOINT ["/bin/bash", "/home/app/main.sh"]