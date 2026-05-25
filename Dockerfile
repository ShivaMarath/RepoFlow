FROM ubuntu:focal
RUN apt-get update
RUN apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
RUN sudo apt-get install -y nodejs
RUN apt-get install git -y
WORKDIR /home/app
COPY main.sh main.sh
ENTRYPOINT [ "/home/app/main.sh" ]