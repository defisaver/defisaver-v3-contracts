// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "../CheatCodes.sol";

import "../../contracts/triggers/CompV3RatioTrigger.sol";
import "../utils/Tokens.sol";
import "../utils/CompUser.sol";
import "../TokenAddresses.sol";

import "../utils/StrategyBuilder.sol";
import "../utils/BundleBuilder.sol";
import "../utils/RegistryUtils.sol";

import "../../contracts/actions/fee/GasFeeTaker.sol";
import "../../contracts/actions/exchange/DFSSell.sol";

contract TestCompV3Automation is DSTest, DSMath, Tokens, TokenAddresses, RegistryUtils {
    constructor() {
        redeploy("CompV3Supply", address(new CompV3Supply()));
        redeploy("CompV3Withdraw", address(new CompV3Withdraw()));
        redeploy("CompV3Borrow", address(new CompV3Borrow()));
        redeploy("CompV3Payback", address(new CompV3Payback()));
        redeploy("CompV3RatioTrigger", address(new CompV3RatioTrigger()));
        redeploy("DFSSell", address(new DFSSell()));
        redeploy("GasFeeTaker", address(new GasFeeTaker()));

        uint repayId = createCompV3Repay();
        uint repayFLId = createCompV3FLRepay();

        uint boostId = createCompV3Boost();
        uint boostFLId = createCompV3FLBoost();

        uint64[] memory repayIds = new uint64[](2);
        repayIds[0] = uint64(repayId);
        repayIds[1] = uint64(repayFLId);
        uint repayBundleId = new BundleBuilder().init(repayIds);

        uint64[] memory boostIds = new uint64[](2);
        boostIds[0] = uint64(boostId);
        boostIds[1] = uint64(boostFLId);
        uint boostBundleId = new BundleBuilder().init(boostIds);

        console.log(repayBundleId, boostBundleId);
    }

    function createCompV3Repay() internal returns (uint) {
        StrategyBuilder repayStrategy = new StrategyBuilder("CompV3Repay", true);
        repayStrategy.addSubMapping("&market");
        repayStrategy.addSubMapping("&baseToken");

        repayStrategy.addTrigger("CompV3RatioTrigger");

        string[] memory withdrawParams = new string[](4);
        withdrawParams[0] = "&market";
        withdrawParams[1] = "&proxy";
        repayStrategy.addAction("CompV3Withdraw", withdrawParams);

        string[] memory sellParams = new string[](5);
        sellParams[1] = "&baseToken";
        sellParams[2] = "$1";
        sellParams[3] = "&proxy";
        sellParams[4] = "&proxy";
        repayStrategy.addAction("DFSSell", sellParams);

        string[] memory gasFeeParams = new string[](3);
        gasFeeParams[1] = "&baseToken";
        gasFeeParams[2] = "$2";
        repayStrategy.addAction("GasFeeTaker", gasFeeParams);

        string[] memory paybackParams = new string[](4);
        paybackParams[0] = "&market";
        paybackParams[1] = "$3";
        paybackParams[2] = "&proxy";
        paybackParams[3] = "&proxy";
        repayStrategy.addAction("CompV3Payback", paybackParams);

        return repayStrategy.createStrategy();
    }

    function createCompV3FLRepay() internal returns (uint) {
        StrategyBuilder repayStrategy = new StrategyBuilder("CompV3FLRepay", true);
        repayStrategy.addSubMapping("&market");
        repayStrategy.addSubMapping("&baseToken");

        repayStrategy.addTrigger("CompV3RatioTrigger");

        string[] memory flParams = new string[](1);
        repayStrategy.addAction("FLBalancer", flParams);

        string[] memory sellParams = new string[](5);
        sellParams[1] = "&baseToken";
        sellParams[3] = "&proxy";
        sellParams[4] = "&proxy";
        repayStrategy.addAction("DFSSell", sellParams);

        string[] memory gasFeeParams = new string[](3);
        gasFeeParams[1] = "&baseToken";
        gasFeeParams[2] = "$2";
        repayStrategy.addAction("GasFeeTaker", gasFeeParams);

        string[] memory paybackParams = new string[](4);
        paybackParams[0] = "&market";
        paybackParams[1] = "$3";
        paybackParams[2] = "&proxy";
        paybackParams[3] = "&proxy";
        repayStrategy.addAction("CompV3Payback", paybackParams);

        string[] memory withdrawParams = new string[](4);
        withdrawParams[0] = "&market";
        withdrawParams[3] = "$1";
        repayStrategy.addAction("CompV3Withdraw", withdrawParams);

        return repayStrategy.createStrategy();
    }

    function createCompV3Boost() internal returns (uint) {
        StrategyBuilder boostStrategy = new StrategyBuilder("CompV3Boost", true);
        boostStrategy.addSubMapping("&market");
        boostStrategy.addSubMapping("&baseToken");

        boostStrategy.addTrigger("CompV3RatioTrigger");

        string[] memory borrowParams = new string[](3);
        borrowParams[0] = "&market";
        borrowParams[2] = "&proxy";
        boostStrategy.addAction("CompV3Borrow", borrowParams);

        string[] memory sellParams = new string[](5);
        sellParams[0] = "&baseToken";
        sellParams[2] = "$1";
        sellParams[3] = "&proxy";
        sellParams[4] = "&proxy";
        boostStrategy.addAction("DFSSell", sellParams);

        string[] memory gasFeeParams = new string[](3);
        gasFeeParams[2] = "$2";
        boostStrategy.addAction("GasFeeTaker", gasFeeParams);

        string[] memory supplyParams = new string[](4);
        supplyParams[0] = "&market";
        supplyParams[2] = "$3";
        supplyParams[3] = "&proxy";
        boostStrategy.addAction("CompV3Supply", supplyParams);

        return boostStrategy.createStrategy();
    }

    function createCompV3FLBoost() internal returns (uint) {
        StrategyBuilder boostStrategy = new StrategyBuilder("CompV3FLBoost", true);
        boostStrategy.addSubMapping("&market");
        boostStrategy.addSubMapping("&baseToken");

        boostStrategy.addTrigger("CompV3RatioTrigger");

        string[] memory flParams = new string[](1);
        boostStrategy.addAction("FLBalancer", flParams);

        string[] memory sellParams = new string[](5);
        sellParams[0] = "&baseToken";
        sellParams[3] = "&proxy";
        sellParams[4] = "&proxy";
        boostStrategy.addAction("DFSSell", sellParams);

        string[] memory gasFeeParams = new string[](3);
        gasFeeParams[2] = "$2";
        boostStrategy.addAction("GasFeeTaker", gasFeeParams);

        string[] memory supplyParams = new string[](4);
        supplyParams[0] = "&market";
        supplyParams[2] = "$3";
        supplyParams[3] = "&proxy";
        boostStrategy.addAction("CompV3Supply", supplyParams);

        string[] memory borrowParams = new string[](4);
        borrowParams[0] = "&market";
        borrowParams[2] = "$1";
        boostStrategy.addAction("CompV3Borrow", borrowParams);

        return boostStrategy.createStrategy();
    }

    function testEmpty() public {

    }
} 