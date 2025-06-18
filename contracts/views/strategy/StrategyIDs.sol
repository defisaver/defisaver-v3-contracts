// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

/// @title Helper library to query some common strategies inside DFS Strategy System
library StrategyIDs {

    function isLimitOrderStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 51) {
           return true;
        }

        if ((block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453) && _strategyID == 9) {
            return true;
        }

        return false;
    }

    function isDCAStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 46) {
            return true;
        }

        if ((block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453) && _strategyID == 8) {
            return true;
        }

        return false;
    }

    function isAaveV3LeverageManagementStrategy(uint256 _strategyID) internal view returns (bool) {
        return isAaveV3RepayStrategy(_strategyID) || isAaveV3BoostStrategy(_strategyID);
    }

    function isAaveV3RepayStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && (_strategyID == 34 || _strategyID == 35)) {
            return true;
        }

        if (
            (block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453) &&
            (_strategyID == 0 || _strategyID == 1)
        ) {
            return true;
        }

        return false;
    }

    function isAaveV3BoostStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && (_strategyID == 36 || _strategyID == 37)) {
            return true;
        }

        if (
            (block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453) &&
            (_strategyID == 2 || _strategyID == 3)
        ) {
            return true;
        }

        return false;
    }

    function isAaveV3CloseStrategy(uint256 _strategyID) internal view returns (bool) {
        if (
            block.chainid == 1 &&
            (_strategyID == 71 || _strategyID == 72 || _strategyID == 73 || _strategyID == 74)
        ) {
            return true;
        }

        if (
            (block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453) &&
            (_strategyID == 4 || _strategyID == 5 || _strategyID == 6 || _strategyID == 7)
        ) {
            return true;
        }

        return false;
    }

    function isSparkLeverageManagementStrategy(uint256 _strategyID) internal view returns (bool) {
        return isSparkRepayStrategy(_strategyID) || isSparkBoostStrategy(_strategyID);
    }

    function isSparkRepayStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && (_strategyID == 57 || _strategyID == 58)) {
            return true;
        }

        return false;
    }

    function isSparkBoostStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && (_strategyID == 59 || _strategyID == 60)) {
            return true;
        }

        return false;
    }
}