#!/usr/bin/env bash

set -o errexit

MODE=coverage scripts/test.sh

yarn istanbul report html lcov
