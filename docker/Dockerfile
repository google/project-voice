# Build based on node slim
FROM node:lts-slim

# Set network interface binding to make the server listen on all interfaces
# This is needed to make the server accessible from outside the container.
ENV FLASK_HOST=0.0.0.0

# Set the working directory inside the container
WORKDIR /app

# Install necessary packages, also install some network utilities for debugging purpose
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 \
    python3-venv python3-pip net-tools iproute2 iputils-ping curl

# Copy all files into container
COPY . /app

# Setup python virtual environment
RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install Node.js dependencies and run build script
RUN npm install && npm run build

EXPOSE 5000

# run server when the container starts
CMD ["npm", "run", "serve"]
