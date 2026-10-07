// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FLActionTestBase } from "./FLActionTestBase.t.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestFLActionSpark is FLActionTestBase {
    function test_should_get_dai_spark_flashloan() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 amount = 2000e18;
        uint256 fee = _sparkFee(amount);

        _giveFeeAndDust(Addresses.DAI_ADDR, fee);

        uint256 flActionBalanceBefore = IERC20(Addresses.DAI_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe =
            _singleTokenFLRecipe("SparkDaiFLRecipe", Addresses.DAI_ADDR, amount, FLSource.SPARK);

        _executeRecipe(recipe);

        _assertNoBalanceChange(Addresses.DAI_ADDR, flActionBalanceBefore);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), walletBalanceBefore - fee);
    }
}
