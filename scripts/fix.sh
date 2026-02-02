#!/bin/bash

ruff format .

shfmt -w ./**/*.sh

./node_modules/.bin/prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"

echo "Fix finished successfully."
