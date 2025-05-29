// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

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

        return false;
    }

    function isAaveV3BoostStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && (_strategyID == 36 || _strategyID == 37)) {
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

    function isAaveV2LeverageManagementStrategy(uint256 _strategyID) internal view returns (bool) {
        return isAaveV2RepayStrategy(_strategyID) || isAaveV2BoostStrategy(_strategyID);
    }

    function isAaveV2RepayStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && (_strategyID == 65 || _strategyID == 66)) {
            return true;
        }

        return false;
    }

    function isAaveV2BoostStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && (_strategyID == 67 || _strategyID == 68)) {
            return true;
        }

        return false;
    }
}