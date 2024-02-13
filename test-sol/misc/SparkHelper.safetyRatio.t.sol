// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../../contracts/actions/spark/helpers/SparkRatioHelper.sol";


contract SafetyRatioTest is Test, SparkRatioHelper {
    SparkRatioHelper ratioHelper;
    SparkRatioHelper previousRatioHelper;

    uint256 mainnetFork;

    string MAINNET_RPC_URL = vm.envString("ETHEREUM_NODE");

    function setUp() public {
        mainnetFork = vm.createFork(MAINNET_RPC_URL, 19220100);
        previousRatioHelper = SparkRatioHelper(0x1F61250B3eFB747C7C0A9dF4851935C95CE387cC);
    }

    function testHealthySingleCollateralSingleDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0xEAA7723633cf598E872D611f5EC50a45b65CBc72;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_SPARK_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_SPARK_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testHealthyMultiCollateralSingleDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0xAA1582084c4f588eF9BE86F5eA1a919F86A3eE57;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_SPARK_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_SPARK_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testHealthySingleCollateralMultiDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0xDe6b2a06407575B98724818445178C1f5fD53361;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_SPARK_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_SPARK_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testHealthyMultiCollateralMultiDebtPosition() public {
        vm.selectFork(mainnetFork);

        address user = 0x338a07Cf3e117d446FFBd3Bc4a60787f892be222;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_SPARK_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_SPARK_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testPositionWithNoDebt() public {
        vm.selectFork(mainnetFork);

        address user = 0xEA57Dc30959eb17c506E4dA095fa9181f3E0Ac6D;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_SPARK_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_SPARK_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testNonexistantPositions() public {
        vm.selectFork(mainnetFork);

        address user = 0x088F62eC26A1d86e1cC5CECEe9DE81FeE48cBF1c;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_SPARK_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_SPARK_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertEq(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }

    function testPositionWithSRUnder100() public {
        vm.selectFork(mainnetFork);

        address user = 0xb44181709c4E6EAB2B72A213E1A0688982c1AF0c;

        uint256 ratioWithNewCalculation = getSafetyRatio(DEFAULT_SPARK_MARKET, user);

        uint256 ratioWithPreviousCalculation = previousRatioHelper.getSafetyRatio(DEFAULT_SPARK_MARKET, user);
        console.log(ratioWithNewCalculation);
        console.log(ratioWithPreviousCalculation);
        assertLt(ratioWithNewCalculation, ratioWithPreviousCalculation);
    }
    
}