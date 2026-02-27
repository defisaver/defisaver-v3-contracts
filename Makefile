# L2 targets default FROM=Mainnet. Override: make test-arbitrum FROM=Optimism.
# test-mainnet: no script unless FROM set (e.g. make test-mainnet FROM=Arbitrum).

.PHONY: test test-mainnet test-arbitrum test-base test-linea test-optimism test-plasma test-all


test:
	forge test

# Change repo network if needed and run tests only on mainnet
test-mainnet:
	$(if $(FROM),node ./cmd/change-repo-network.js $(FROM) Mainnet,)
	FOUNDRY_PROFILE=default forge test

# Change repo network and run tests only on arbitrum. FROM=Mainnet by default.
test-arbitrum:
	node ./cmd/change-repo-network.js $(or $(FROM),Mainnet) Arbitrum
	FOUNDRY_PROFILE=arbitrum forge test

# Change repo network and run tests only on base. FROM=Mainnet by default.
test-base:
	node ./cmd/change-repo-network.js $(or $(FROM),Mainnet) Base
	FOUNDRY_PROFILE=base forge test

# Change repo network and run tests only on linea. FROM=Mainnet by default.
test-linea:
	node ./cmd/change-repo-network.js $(or $(FROM),Mainnet) Linea
	FOUNDRY_PROFILE=linea forge test

# Change repo network and run tests only on optimism. FROM=Mainnet by default.
test-optimism:
	node ./cmd/change-repo-network.js $(or $(FROM),Mainnet) Optimism
	FOUNDRY_PROFILE=optimism forge test

# Change repo network and run tests only on plasma. FROM=Mainnet by default.
test-plasma:
	node ./cmd/change-repo-network.js $(or $(FROM),Mainnet) Plasma
	FOUNDRY_PROFILE=plasma forge test

# test-all runs tests on all chains in order. 
test-all: test-mainnet
	$(MAKE) test-arbitrum FROM=Mainnet && \
	$(MAKE) test-base FROM=Arbitrum && \
	$(MAKE) test-linea FROM=Base && \
	$(MAKE) test-optimism FROM=Linea && \
	$(MAKE) test-plasma FROM=Optimism
