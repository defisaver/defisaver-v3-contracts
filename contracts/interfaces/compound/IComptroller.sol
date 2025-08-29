// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IComptroller {
    struct CompMarketState {
        uint224 index;
        uint32 block;
    }

    mapping(address => uint256) public compSpeeds;

    mapping(address => uint256) public borrowCaps;

    mapping(address => uint256) public compBorrowSpeeds;
    mapping(address => uint256) public compSupplySpeeds;

    function claimComp(address holder) public virtual;
    function claimComp(address holder, address[] memory cTokens) public virtual;
    function claimComp(address[] memory holders, address[] memory cTokens, bool borrowers, bool suppliers)
        public
        virtual;

    function compSupplyState(address) public view virtual returns (CompMarketState memory);
    function compSupplierIndex(address, address) public view virtual returns (uint256);
    function compAccrued(address) public view virtual returns (uint256);

    function compBorrowState(address) public view virtual returns (CompMarketState memory);
    function compBorrowerIndex(address, address) public view virtual returns (uint256);

    function enterMarkets(address[] calldata cTokens) external virtual returns (uint256[] memory);

    function exitMarket(address cToken) external virtual returns (uint256);

    function getAssetsIn(address account) external view virtual returns (address[] memory);

    function markets(address account) public view virtual returns (bool, uint256);

    function getAccountLiquidity(address account) external view virtual returns (uint256, uint256, uint256);

    function oracle() public view virtual returns (address);

    function mintGuardianPaused(address cToken) external view virtual returns (bool);
    function borrowGuardianPaused(address cToken) external view virtual returns (bool);
}
