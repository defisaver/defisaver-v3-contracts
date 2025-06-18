// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

abstract contract IComptroller {
    struct CompMarketState {
        uint224 index;
        uint32 block;
    }

    mapping(address => uint) public compSpeeds;

    mapping(address => uint) public borrowCaps;

    mapping(address => uint) public compBorrowSpeeds;
    mapping(address => uint) public compSupplySpeeds;

    function claimComp(address holder) public virtual;
    function claimComp(address holder, address[] memory cTokens) public virtual;
    function claimComp(address[] memory holders, address[] memory cTokens, bool borrowers, bool suppliers) public virtual;

    function compSupplyState(address) public view virtual returns (CompMarketState memory);
    function compSupplierIndex(address,address) public view virtual returns (uint);
    function compAccrued(address) public view virtual returns (uint);

    function compBorrowState(address) public view virtual returns (CompMarketState memory);
    function compBorrowerIndex(address,address) public view virtual returns (uint);

    function enterMarkets(address[] calldata cTokens) external virtual returns (uint256[] memory);

    function exitMarket(address cToken) external virtual returns (uint256);

    function getAssetsIn(address account) external virtual view returns (address[] memory);

    function markets(address account) public virtual view returns (bool, uint256);

    function getAccountLiquidity(address account) external virtual view returns (uint256, uint256, uint256);

    function oracle() public virtual view returns (address);
    
    function mintGuardianPaused(address cToken) external virtual view returns (bool);
    function borrowGuardianPaused(address cToken) external virtual view returns (bool);
}
