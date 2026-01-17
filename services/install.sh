#!/bin/bash

# Get the absolute path of the current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT="$(dirname "$DIR")"
USER=$(whoami)

echo "Installing Kettle services..."
echo "Project Root: $PROJECT_ROOT"
echo "User: $USER"

# Create the service files from templates
sed "s|{{WORKING_DIRECTORY}}|$PROJECT_ROOT|g; s|{{USER}}|$USER|g" "$PROJECT_ROOT/services/kettle.service.template" > "$PROJECT_ROOT/services/kettle.service"
sed "s|{{USER}}|$USER|g" "$PROJECT_ROOT/services/kettle-tunnel.service.template" > "$PROJECT_ROOT/services/kettle-tunnel.service"

# Copy to systemd directory
sudo cp "$PROJECT_ROOT/services/kettle.service" /etc/systemd/system/kettle.service
sudo cp "$PROJECT_ROOT/services/kettle-tunnel.service" /etc/systemd/system/kettle-tunnel.service

# Reload systemd and enable services
sudo systemctl daemon-reload
sudo systemctl enable kettle
sudo systemctl enable kettle-tunnel

# Start services
sudo systemctl start kettle
sudo systemctl start kettle-tunnel

echo "Installation complete!"
echo "You can check the status with:"
echo "  systemctl status kettle"
echo "  systemctl status kettle-tunnel"
