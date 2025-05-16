// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IMultiTroveGetter {
    struct CombinedTroveData {
        uint256 id;
        uint256 debt;
        uint256 coll;
        uint256 stake;
        uint256 annualInterestRate;
        uint256 lastDebtUpdateTime;
        uint256 lastInterestRateAdjTime;
        address interestBatchManager;
        uint256 batchDebtShares;
        uint256 batchCollShares;
        uint256 snapshotETH;
        uint256 snapshotBoldDebt;
    }

    struct CombinedTroveData {
        uint256 id;
        uint256 entireDebt;
        uint256 entireColl;
        uint256 redistBoldDebtGain;
        uint256 redistCollGain;
        uint256 accruedInterest;
        uint256 recordedDebt;
        uint256 annualInterestRate;
        uint256 accruedBatchManagementFee;
        uint256 lastInterestRateAdjTime;
        uint256 stake;
        uint256 lastDebtUpdateTime;
        address interestBatchManager;
        uint256 batchDebtShares;
        uint256 snapshotETH;
        uint256 snapshotBoldDebt;
    }

    function getMultipleSortedTroves(uint256 _collIndex, int256 _startIdx, uint256 _count)
        external
        view
        returns (CombinedTroveData[] memory _troves);
}
