#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

if [ "$MODE" = "coverage" ]; then
  ganache_port=8555
else
  ganache_port=8545
fi

ganache_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  echo "$MODE";
  if [ "$MODE" = "coverage" ]; then
    npx testrpc-sc --allowUnlimitedContractSize true --gasLimit 0xfffffffffffff --port "$ganache_port" --networkId 1234 > /dev/null &
  else
    npx ganache-cli --gasLimit 0xfffffffffff --port "$ganache_port" > /dev/null &
  fi

  ganache_pid=$!

  echo "Waiting for ganache to launch on port "$ganache_port"..."

  while ! ganache_running; do
    sleep 0.1 # wait for 1/10 of the second before checking again
  done

  echo "Ganache launched!"
}

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
fi

yarn truffle version

if [ "$MODE" = "coverage" ]; then
  yarn solidity-coverage
else
  yarn truffle test "$@"
fi
