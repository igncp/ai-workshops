#!/bin/bash

set -e

podman volume create n8n_data || true

podman run -it --rm \
	--name n8n \
	-p 5678:5678 \
	-e GENERIC_TIMEZONE="Asia/Hong_Kong" \
	-e TZ="Asia/Hong_Kong" \
	-e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
	-e N8N_RUNNERS_ENABLED=true \
	-v n8n_data:/home/node/.n8n \
	docker.n8n.io/n8nio/n8n
