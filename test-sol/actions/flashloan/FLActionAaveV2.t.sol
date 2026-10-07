// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FLActionTestBase } from "./FLActionTestBase.t.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestFLActionAaveV2 is FLActionTestBase {
    function test_should_get_dai_aave_v2_flashloan() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 amount = 1000e18;
        uint256 fee = _aaveV2Fee(amount);

        _giveFeeAndDust(Addresses.DAI_ADDR, fee);

        uint256 flActionBalanceBefore = IERC20(Addresses.DAI_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe =
            _singleTokenFLRecipe("AaveV2DaiFLRecipe", Addresses.DAI_ADDR, amount, FLSource.AAVEV2);

        _executeRecipe(recipe);

        _assertNoBalanceChange(Addresses.DAI_ADDR, flActionBalanceBefore);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), walletBalanceBefore - fee);
    }
}
