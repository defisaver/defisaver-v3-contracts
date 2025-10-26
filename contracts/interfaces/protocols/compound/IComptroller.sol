// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IComptroller {
    struct CompMarketState {
        uint224 index;
        uint32 block;
    }

    function compSpeeds(address) external view returns (uint256);
    function borrowCaps(address) external view returns (uint256);
    function compBorrowSpeeds(address) external view returns (uint256);
    function compSupplySpeeds(address) external view returns (uint256);
    function claimComp(address holder) external;
    function claimComp(address holder, address[] memory cTokens) external;
    function claimComp(address[] memory holders, address[] memory cTokens, bool borrowers, bool suppliers) external;
    function compSupplyState(address) external view returns (CompMarketState memory);
    function compSupplierIndex(address, address) external view returns (uint256);
    function compAccrued(address) external view returns (uint256);
    function compBorrowState(address) external view returns (CompMarketState memory);
    function compBorrowerIndex(address, address) external view returns (uint256);
    function enterMarkets(address[] calldata cTokens) external returns (uint256[] memory);
    function exitMarket(address cToken) external returns (uint256);
    function getAssetsIn(address account) external view returns (address[] memory);
    function markets(address account) external view returns (bool, uint256);
    function getAccountLiquidity(address account) external view returns (uint256, uint256, uint256);
    function oracle() external view returns (address);
    function mintGuardianPaused(address cToken) external view returns (bool);
    function borrowGuardianPaused(address cToken) external view returns (bool);
}
