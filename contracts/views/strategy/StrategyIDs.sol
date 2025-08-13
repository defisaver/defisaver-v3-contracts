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


    function isCompoundV3LeverageManagementStrategy(uint256 _strategyID) internal view returns (bool) {
        return isCompoundV3RepayStrategy(_strategyID) || isCompoundV3BoostStrategy(_strategyID);
    }

    function isCompoundV3RepayStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1) {
            // CompV3Repay
            if (_strategyID == 15) return true;
            // CompV3EOARepayStrategy
            if (_strategyID == 23) return true;
            /// CompV3FlRepayStrategyV2
            if (_strategyID == 82) return true;
            // CompV3FlEOARepayStrategyV2
            if (_strategyID == 84) return true;
            // CompV3RepayOnPriceStrategy
            if (_strategyID == 118) return true;
            // CompV3FLRepayOnPriceStrategy
            if (_strategyID == 119) return true;
        }

        // arbitrum
        if (block.chainid == 42161) {
            // CompV3RepayL2
            if (_strategyID == 10) return true;
            // CompV3FlRepayL2
            if (_strategyID == 11) return true;
            // CompV3RepayOnPriceL2Strategy
            if (_strategyID == 22) return true;
            // CompV3FLRepayOnPriceL2Strategy
            if (_strategyID == 23) return true;
            // CompV3EOARepayL2Strategy
            if (_strategyID == 28) return true;
            // CompV3EOAFlRepayL2Strategy
            if (_strategyID == 29) return true;
        }

        // base
        if (block.chainid == 8453) {
            // CompV3RepayL2
            if (_strategyID == 10) return true;
            // CompV3FlRepayL2
            if (_strategyID == 11) return true;
            // CompV3RepayOnPriceL2Strategy
            if (_strategyID == 36) return true;
            // CompV3FLRepayOnPriceL2Strategy
            if (_strategyID == 37) return true;
            // CompV3EOARepayL2Strategy
            if (_strategyID == 42) return true;
            // CompV3EOAFlRepayL2Strategy
            if (_strategyID == 43) return true;

        }

        return false;
    }

  function isCompoundV3BoostStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1) {
            // CompV3Boost
            if (_strategyID == 19) return true;
            // CompV3EOABoostStrategy
            if (_strategyID == 27) return true;
            // CompV3FlBoostStrategyV2
            if (_strategyID == 83) return true;
            // CompV3EOAFlBoostStrategyV2
            if (_strategyID == 85) return true;
            // CompV3BoostOnPriceStrategy
            if (_strategyID == 120) return true;
            // CompV3FLBoostOnPriceStrategy
            if (_strategyID == 121) return true;
        }

        // arbitrum
        if (block.chainid == 42161) {
            // CompV3BoostL2
            if (_strategyID == 12) return true;
            // CompV3FlBoostL2
            if (_strategyID == 13) return true;
            // CompV3BoostOnPriceL2Strategy
            if (_strategyID == 24) return true;
            // CompV3FLBoostOnPriceL2Strategy
            if (_strategyID == 25) return true;
            // CompV3EOABoostL2Strategy
            if (_strategyID == 30) return true;
            // CompV3EOAFLBoostL2Strategy
            if (_strategyID == 31) return true;
        }

        // base
        if (block.chainid == 8453) {
            // CompV3BoostL2
            if (_strategyID == 12) return true;
            // CompV3FlBoostL2
            if (_strategyID == 13) return true;
            // CompV3BoostOnPriceL2Strategy
            if (_strategyID == 38) return true;
            // CompV3FLBoostOnPriceL2Strategy
            if (_strategyID == 39) return true;
            // CompV3EOABoostL2Strategy
            if (_strategyID == 44) return true;
            // CompV3EOAFLBoostL2Strategy
            if (_strategyID == 45) return true;
        }

        return false;
    }


    function isCompoundV3CloseStrategy(uint256 _strategyID) internal view returns (bool) {
        if (block.chainid == 1) {
            // CompV3FLCloseToDebtStrategy
            if (_strategyID == 122) return true;
            // CompV3FLCloseToCollStrategy
            if (_strategyID == 123) return true;
        }

        // arbitrum
        if (block.chainid == 42161) {
            if (_strategyID == 26) return true;
            if (_strategyID == 27) return true;
        }

        // base
        if (block.chainid == 8453) {
            if (_strategyID == 40) return true;
            if (_strategyID == 41) return true;
        }

        return false;
    }


}