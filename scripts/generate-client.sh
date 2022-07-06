#!/usr/bin/env bash
#
# Generates a Typescript client for display-api-service

set -euo pipefail
IFS=$'\n\t'

if [[ $# -lt 1 ]] ; then
    echo "Syntax: $0 <checkout root>"
    echo "  where <checkout root> is a directory that contains a checkout of display-kk-integration and display-api-service"
    exit 1
fi
CHECKOUT_ROOT=$1

cd "${CHECKOUT_ROOT}"

# We skip validation for now as the spec is not 100% valid
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli \
  generate \
    --input-spec /local/display-api-service/public/api-spec-v1.json \
    --generator-name typescript-axios \
    --skip-validate-spec \
    --output /local/kk-display-integration/src/display-api-client
