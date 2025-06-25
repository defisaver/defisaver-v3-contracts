#!/bin/bash

# Run forge coverage on mainnet core contracts
forge coverage --no-match-coverage "(test|interfaces|mock|node_modules|script|actions|views|triggers|utils|exchangeV3|DS/|tx-saver|l2)" 