// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FLActionTestBase } from "./FLActionTestBase.t.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestFLActionMorphoBlue is FLActionTestBase {
    function test_should_get_weth_morpho_blue_flashloan() public {
        uint256 amount = 1 ether;

        _giveToken(Addresses.WETH_ADDR, flActionAddr, PRE_EXISTING_FL_ACTION_BALANCE);

        uint256 flActionBalanceBefore = IERC20(Addresses.WETH_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe = _morphoBlueFLRecipe(Addresses.WETH_ADDR, amount);

        _executeRecipe(recipe);

        _assertNoBalanceChange(Addresses.WETH_ADDR, flActionBalanceBefore);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), walletBalanceBefore);
    }
}
