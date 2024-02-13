// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "forge-std/Test.sol";
import "../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";


contract SafetyRatioTest is Test {
    AaveV3RatioHelper ratioHelper;

    function setUp() public {
        ratioHelper = new AaveV3RatioHelper();
    }
}