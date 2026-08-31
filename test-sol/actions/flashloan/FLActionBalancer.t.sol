// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FLActionTestBase } from "./FLActionTestBase.t.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestFLActionBalancer is FLActionTestBase {
    function test_should_get_weth_and_dai_balancer_flashloan() public {
        skipIfBalancerFlashloansAreNotSupported();

        uint256 wethAmount = 1 ether;
        uint256 daiAmount = 1000e18;

        (address[] memory tokens, uint256[] memory amounts) =
            _sortTokens(Addresses.WETH_ADDR, Addresses.DAI_ADDR, wethAmount, daiAmount);

        _giveToken(tokens[0], flActionAddr, PRE_EXISTING_FL_ACTION_BALANCE);
        _giveToken(tokens[1], flActionAddr, PRE_EXISTING_FL_ACTION_BALANCE);

        uint256 flActionBalance0Before = IERC20(tokens[0]).balanceOf(flActionAddr);
        uint256 flActionBalance1Before = IERC20(tokens[1]).balanceOf(flActionAddr);

        StrategyModel.Recipe memory recipe = _balancerFLRecipe(tokens, amounts);

        _executeRecipe(recipe);

        _assertNoBalanceChange(tokens[0], flActionBalance0Before);
        _assertNoBalanceChange(tokens[1], flActionBalance1Before);
    }

    function skipIfBalancerFlashloansAreNotSupported() internal {
        if (!isFLBalancerSupportedOnSelectedNetwork()) {
            vm.skip(true, "Skipping test. Balancer flashloans not supported on selected network.");
        }
    }
}
