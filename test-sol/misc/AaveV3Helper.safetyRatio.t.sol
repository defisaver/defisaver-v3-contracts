// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "forge-std/Test.sol";
import "../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";


contract SafetyRatioTest is Test, AaveV3RatioHelper {
    AaveV3RatioHelper ratioHelper;
    AaveV3RatioHelper previousRatioHelper;

    uint256 mainnetFork;

    string MAINNET_RPC_URL = vm.envString("ETHEREUM_NODE");

    function setUp() public {
        mainnetFork = vm.createFork(MAINNET_RPC_URL, 19220100);
        previousRatioHelper = AaveV3RatioHelper(0xC1b97aB9eF18EeE338a381c6f74470AA5C567283);
    }

    function testHealthySingleCollateralSingleDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0x931433324E6B0b5B04E3460ef3fb3f78dda3c721;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testHealthyMultiCollateralSingleDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0x33333aea097c193e66081E930c33020272b33333;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testHealthySingleCollateralMultiDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0x2442778ba8384E618f61d13c4c6f52c6d671064A;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testHealthyMultiCollateralMultiDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0x01d1f55d94a53a9517c07f793f35320FAA0D2DCf;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testPositionWithNoDebt() public {
        vm.selectFork(mainnetFork);

        address user = 0x000000000000000000000000000000000000dEaD;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testNonexistantPositions() public {
        vm.selectFork(mainnetFork);

        address user = 0xEA57Dc30959eb17c506E4dA095fa9181f3E0Ac6D;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testPositionWithSRUnder100() public {
        vm.selectFork(mainnetFork);

        address user = 0x9cCf93089cb14F94BAeB8822F8CeFfd91Bd71649;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertLt(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }
}