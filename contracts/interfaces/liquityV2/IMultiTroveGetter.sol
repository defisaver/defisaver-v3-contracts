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

    struct DebtPerInterestRate {
        address interestBatchManager;
        uint256 interestRate;
        uint256 debt;
    }

    function getMultipleSortedTroves(uint256 _collIndex, int256 _startIdx, uint256 _count)
        external
        view
        returns (CombinedTroveData[] memory _troves);

    function getDebtPerInterestRateAscending(uint256 _collIndex, uint256 _startId, uint256 _maxIterations)
        external
        view
        returns (DebtPerInterestRate[] memory, uint256 currId);
}
