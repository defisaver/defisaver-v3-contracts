
// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

abstract contract IGUniLev {
    function wind(
        uint256 principal,
        uint256 minWalletDai
    ) external virtual;
    function getUnwindEstimates(uint256 ink, uint256 art) external view virtual returns (uint256 estimatedDaiRemaining);
    function getWindEstimates(address usr, uint256 principal) external view virtual returns (uint256 estimatedDaiRemaining, uint256 estimatedGuniAmount, uint256 estimatedDebt);
    function unwind(
        uint256 minWalletDai
    ) external virtual;
}