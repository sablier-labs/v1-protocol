#!/usr/bin/env bash

set -o errexit

MODE=coverage scripts/test.sh

yarn istanbul report html lcov

if [ "$CI" = true ]; then
  cat ./coverage/lcov.info | yarn codecov
fi
