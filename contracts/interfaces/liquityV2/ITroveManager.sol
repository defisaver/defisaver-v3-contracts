// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ITroveManager {

    struct LatestTroveData {
        uint256 entireDebt;
        uint256 entireColl;
        uint256 redistBoldDebtGain;
        uint256 redistCollGain;
        uint256 accruedInterest;
        uint256 recordedDebt;
        uint256 annualInterestRate;
        uint256 weightedRecordedDebt;
        uint256 accruedBatchManagementFee;
        uint256 lastInterestRateAdjTime;
    }

    function getLatestTroveData(uint256 _troveId) external view returns (LatestTroveData memory);
}
