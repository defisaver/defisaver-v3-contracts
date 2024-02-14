// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "forge-std/Test.sol";
import { AaveRatioHelper } from "./../../contracts/actions/aave/helpers/AaveRatioHelper.sol";


contract AaveRatioHelperTest is Test, AaveRatioHelper {
    AaveRatioHelper ratioHelper;
    AaveRatioHelper previousRatioHelper;

    uint256 mainnetFork;

    string MAINNET_RPC_URL = vm.envString("ETHEREUM_NODE");

    function setUp() public {
        mainnetFork = vm.createFork(MAINNET_RPC_URL, 19220100);
        previousRatioHelper = AaveRatioHelper(0xafdB4566876590527cAA31633A2208Ea77d5BC15);
    }

    function testHealthySingleCollateralSingleDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0xEf001a0D62d43Ccab7Ac9c461F538E707a9eDBF2;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testHealthyMultiCollateralSingleDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0xc94680947CF2114ec8eE43725898EAA7269a98c5;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testHealthySingleCollateralMultiDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0x702a39a9d7D84c6B269efaA024dff4037499bBa9;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testHealthyMultiCollateralMultiDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0x777777c9898D384F785Ee44Acfe945efDFf5f3E0;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testPositionWithNoDebt() public {
        vm.selectFork(mainnetFork);

        address user = 0x0000a594E028d5B5DD614F4f3A1184Db82110000;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testNonexistantPositions() public {
        vm.selectFork(mainnetFork);

        address user = 0xEA57Dc30959eb17c506E4dA095fa9181f3E0Ac6D;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testPositionWithSRUnder100() public {
        vm.selectFork(mainnetFork);

        address user = 0x8611E6b42630Dca3c5ff0F5d018E0EaF55D57234;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_AAVE_V2_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertLt(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }
}