#!/bin/bash

echo "Restarting Kettle services..."

sudo systemctl restart kettle
sudo systemctl restart kettle-tunnel

echo "Services restarted."
systemctl status kettle --no-pager
systemctl status kettle-tunnel --no-pager
