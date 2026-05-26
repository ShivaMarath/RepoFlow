FROM ubuntu:focal
RUN apt-get update
RUN apt-get install -y curl dos2unix 
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install git -y
WORKDIR /home/app
COPY main.sh main.sh
ENTRYPOINT [ "/home/app/main.sh" ]