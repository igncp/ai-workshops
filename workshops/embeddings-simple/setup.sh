#!/usr/bin/env bash

set -e

. .venv/bin/activate

pip install -r requirements.txt

npm i

huggingface-cli download sentence-transformers/all-MiniLM-L6-v2
