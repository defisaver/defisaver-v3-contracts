#!/bin/bash

# excluding everything else (It seems it has to be done this way for now ¯\_(ツ)_/¯ as there is no --match-path option)
ignored=(
  test
  interfaces
  mock
  node_modules
  script
  views
  triggers
  utils
  exchangeV3
  DS/
  tx-saver
  l2
  actions/aave
  actions/aaveV3
  actions/bprotocol
  actions/checkers
  actions/compound
  actions/compoundV3
  actions/convex
  actions/curve
  actions/curveusd
  actions/dydx
  actions/etherfi
  actions/eulerV2
  actions/exchange
  actions/fee
  actions/flashloan
  actions/guni
  actions/insta
  actions/lido
  actions/liquity
  actions/liquityV2
  actions/llamalend
  actions/lsv
  actions/mcd
  actions/merkel
  actions/morpho
  actions/morpho-blue
  actions/reflexer
  actions/renzo
  actions/sky
  actions/spark
  actions/uniswap
  actions/utils
  actions/yearn
  core
  auth
  ActionBase
  FluidClaim
)

regex="($(IFS='|'; echo "${ignored[*]}"))"

forge coverage --no-match-coverage "$regex"