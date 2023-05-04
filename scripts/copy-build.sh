#!/bin/bash

set -e

cd /home/dmilios/playalong-collab
npm run build
sudo cp -r dist/* /var/www/html/apprepository/playalong-collab
