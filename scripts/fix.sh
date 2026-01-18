#!/bin/bash

ruff format .

shfmt -w ./**/*.sh

echo "Fix finished successfully."
