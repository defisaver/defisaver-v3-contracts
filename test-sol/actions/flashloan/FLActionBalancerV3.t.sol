// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FLActionTestBase } from "./FLActionTestBase.t.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

interface IBalancerV3VaultReserves {
    function getReservesOf(IERC20 token) external view returns (uint256);
}

contract TestFLActionBalancerV3 is FLActionTestBase {
    function test_should_get_weth_balancer_v3_flashloan() public {
        uint256 wethAmount = _balancerV3FlashLoanAmount(Addresses.WETH_ADDR, 5 ether);

        address[] memory tokens = new address[](1);
        tokens[0] = Addresses.WETH_ADDR;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = wethAmount;

        _giveToken(tokens[0], flActionAddr, PRE_EXISTING_FL_ACTION_BALANCE);

        uint256 flActionBalance0Before = IERC20(tokens[0]).balanceOf(flActionAddr);

        StrategyModel.Recipe memory recipe = _balancerV3FLRecipe(tokens, amounts);

        _executeRecipe(recipe);

        _assertNoBalanceChange(tokens[0], flActionBalance0Before);
    }

    function _balancerV3FlashLoanAmount(address _token, uint256 _preferredAmount)
        internal
        returns (uint256 amount)
    {
        uint256 vaultReserves =
            IBalancerV3VaultReserves(BALANCER_V3_VAULT_ADDR).getReservesOf(IERC20(_token));

        amount = vaultReserves > _preferredAmount ? _preferredAmount : vaultReserves / 2;
        if (amount == 0) {
            vm.skip(true, "Skipping test. Balancer V3 vault has no reserves for selected token.");
        }
    }
}
