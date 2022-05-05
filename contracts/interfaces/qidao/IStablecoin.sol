// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IStablecoin {
	
	function getDebtCeiling() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function getClosingFee() external view returns (uint256);

    function getOpeningFee() external view returns (uint256);

    function getTokenPriceSource() external view returns (uint256);

    function getEthPriceSource() external view returns (uint256);

    function createVault() external returns (uint256);

    function destroyVault(uint256 vaultID) external;

    function transferVault(uint256 vaultID, address to) external;

    function depositCollateral(uint256 vaultID) external payable;

    function depositCollateral(uint256 vaultID, uint256 amount) external payable;

    function withdrawCollateral(uint256 vaultID, uint256 amount) external;

    function borrowToken(uint256 vaultID, uint256 amount) external;

    function vaultDebt(uint256 vaultId) external view returns (uint256);

    function payBackToken(uint256 vaultID, uint256 amount) external;

    function buyRiskyVault(uint256 vaultID) external;

    function collateral() external view returns (address);

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256 tokenId);

    function vaultCollateral(uint256 vaultId) external view returns (uint256 collAmount);
}