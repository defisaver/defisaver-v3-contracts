// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IPendleMarket {
    function swapExactPtForSy(
        address receiver,
        uint256 exactPtIn,
        bytes calldata data
    ) external returns (uint256 netSyOut, uint256 netSyFee);

    function swapSyForExactPt(
        address receiver,
        uint256 exactPtOut,
        bytes calldata data
    ) external returns (uint256 netSyIn, uint256 netSyFee);

    function readTokens() external view returns (address SY, address PT, address YT);

    function isExpired() external view returns (bool);
}