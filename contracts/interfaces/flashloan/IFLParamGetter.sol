// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IFLParamGetter {
    function getFlashLoanParams(bytes memory _data)
        external
        view
        returns (address[] memory tokens, uint256[] memory amount, uint256[] memory modes);
}
