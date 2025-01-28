// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ITroveManager {
    enum Status {
        nonExistent,
        active,
        closedByOwner,
        closedByLiquidation,
        zombie
    }

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

    struct LatestBatchData {
        uint256 entireDebtWithoutRedistribution;
        uint256 entireCollWithoutRedistribution;
        uint256 accruedInterest;
        uint256 recordedDebt;
        uint256 annualInterestRate;
        uint256 weightedRecordedDebt;
        uint256 annualManagementFee;
        uint256 accruedManagementFee;
        uint256 weightedRecordedBatchManagementFee;
        uint256 lastDebtUpdateTime;
        uint256 lastInterestRateAdjTime;
    }


    function Troves(uint256 _id)
        external
        view
        returns (
            uint256 debt,
            uint256 coll,
            uint256 stake,
            Status status,
            uint64 arrayIndex,
            uint64 lastDebtUpdateTime,
            uint64 lastInterestRateAdjTime,
            uint256 annualInterestRate,
            address interestBatchManager,
            uint256 batchDebtShares
        );

    function shutdownTime() external view returns (uint256);
    function troveNFT() external view returns (address);
    function getLatestTroveData(uint256 _troveId) external view returns (LatestTroveData memory);
    function getCurrentICR(uint256 _troveId, uint256 _price) external view returns (uint256);
    function getTroveStatus(uint256 _troveId) external view returns (Status);
    function getTroveAnnualInterestRate(uint256 _troveId) external view returns (uint256);
    function getLatestBatchData(address _batchAddress) external view returns (LatestBatchData memory);
}
