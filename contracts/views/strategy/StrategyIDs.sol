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

    // Aave V3
    function isAaveV3LeverageManagementStrategy(uint256 _strategyID) internal view returns (bool) {
        return isAaveV3RepayStrategy(_strategyID) || isAaveV3BoostStrategy(_strategyID);
    }

    function isAaveV3RepayStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 34) {
            return true;
        }

        if ((block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453) && (_strategyID == 0)) {
            return true;
        }

        return false;
    }

    function isAaveV3BoostStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 36) {
            return true;
        }

        if ((block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453) && (_strategyID == 2)) {
            return true;
        }

        return false;
    }

    function isAaveV3RepayOnPriceStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 96) {
            return true;
        }

        // arbitrum
        if (block.chainid == 42161 && _strategyID == 16) {
            return true;
        }

        // base
        if (block.chainid == 8453 && _strategyID == 28) {
            return true;
        }

        // optimism
        if (block.chainid == 10 && _strategyID == 12) {
            return true;
        }

        return false;
    }

    function isAaveV3CloseStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && (_strategyID == 71 || _strategyID == 73)) {
            return true;
        }

        if (
            (block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453)
                && (_strategyID == 4 || _strategyID == 6)
        ) {
            return true;
        }

        return false;
    }

    // Spark
    function isSparkLeverageManagementStrategy(uint256 _strategyID) internal view returns (bool) {
        return isSparkRepayStrategy(_strategyID) || isSparkBoostStrategy(_strategyID);
    }

    function isSparkRepayStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 57) {
            return true;
        }

        return false;
    }

    function isSparkBoostStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 59) {
            return true;
        }

        return false;
    }

    // Compound V3
    function isCompoundV3LeverageManagementStrategy(uint256 _strategyID) internal view returns (bool) {
        return isCompoundV3RepayStrategy(_strategyID) || isCompoundV3BoostStrategy(_strategyID);
    }

    function isCompoundV3RepayStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 15) return true;
        // arbitrum & base
        if ((block.chainid == 42161 || block.chainid == 8453) && _strategyID == 10) return true;
        return false;
    }

    function isCompoundV3RepayOnPriceStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 118) return true;
        // arbitrum
        if (block.chainid == 42161 && _strategyID == 22) return true;
        // base
        if (block.chainid == 8453 && _strategyID == 36) return true;

        return false;
    }

    function isCompoundV3BoostStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 19) return true;
        // arbitrum & base
        if ((block.chainid == 42161 || block.chainid == 8453) && _strategyID == 12) return true;

        return false;
    }

    function isCompoundV3CloseStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1 && _strategyID == 122) return true;
        // arbitrum
        if (block.chainid == 42161 && _strategyID == 26) return true;
        // base
        if (block.chainid == 8453 && _strategyID == 40) return true;

        return false;
    }
}
