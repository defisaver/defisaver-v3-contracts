// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;


interface ILlamaLendVault {
    function borrow_apr() external view returns (uint256);
    function lend_apr() external view returns (uint256);
}
