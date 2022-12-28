# Check that given variables are set and all have non-empty values,
# die with an error otherwise.
#
# Params:
#   1. Variable name(s) to test.
#   2. (optional) Error message to print.

#			printf $(_ERROR) "WRONG" "Stopping" ;
#			printf $(_TITLE) "OK" "Continuing" ;
SHELL := /bin/bash
confirm:
	@if [[ -z "$(CI)" ]]; then \
		echo "⚠ This command is deprecated, use push-prod or push-stage instead" \
		REPLY="" ; \
		read -p "To continue type push-prod > " -r ; \
		if [[ ! $$REPLY =~ ^[push-prod]$$ ]]; then \
			exit 0; \
		else \
			exit 0 ; \
		fi \
	fi
check_defined = \
    $(strip $(foreach 1,$1, \
        $(call __check_defined,$1,$(strip $(value 2)))))
__check_defined = \
    $(if $(value $1),, \
      $(error Undefined $1$(if $2, ($2))))

gib_money = \
	node cmd/forkooor.js gib-money $1

set_auth = \
	node cmd/forkooor.js set-bot-auth $1

init = \
	npx hardhat changeRepoNetwork Optimism ${network} && npx hardhat changeRepoNetwork Mainnet ${network} && npx hardhat changeRepoNetwork Arbitrum ${network} &&\
	node cmd/forkooor.js new-fork ${network}

top-up:
	$(call check_defined, acc, set acc)
	$(call gib_money,${acc})

new-fork:
	$(call check_defined, network, set network)
	$(call init,${network})
	@if [ "mainnet" = "$(network)" ]; then\
		$(call gib_money,0x61fe1bdcd91e8612a916f86ba50a3edf3e5654c4);\
		$(call gib_money,0x07d747ff04b09bea2187d62c49780d9676159274);\
		$(call set_auth,0x61fe1bdcd91e8612a916f86ba50a3edf3e5654c4);\
		$(call set_auth,0x07d747ff04b09bea2187d62c49780d9676159274);\
	else if [ "optimism" = "$(network)" ]; then\
		$(call gib_money,0xC9a956923bfb5F141F1cd4467126b3ae91E5CC33);\
		$(call gib_money,0x61fe1bdcd91e8612a916f86ba50a3edf3e5654c4);\
		$(call gib_money,0x16dd89d6e2f81d0528120fb31f6cfe8528e2738e);\
		$(call set_auth,0x61fe1bdcd91e8612a916f86ba50a3edf3e5654c4);\
		$(call set_auth,0x16dd89d6e2f81d0528120fb31f6cfe8528e2738e);\
	else if [ "arbitrum" = "$(network)" ]; then\
		$(call gib_money,0x926516e60521556f4ab5e7bf16a4d41a8539c7d1);\
		$(call gib_money,0x61fe1bdcd91e8612a916f86ba50a3edf3e5654c4);\
		$(call gib_money,0x16dd89d6e2f81d0528120fb31f6cfe8528e2738e);\
		$(call set_auth,0x61fe1bdcd91e8612a916f86ba50a3edf3e5654c4);\
		$(call set_auth,0x16dd89d6e2f81d0528120fb31f6cfe8528e2738e);\
	fi;\
	fi;\
	fi;
