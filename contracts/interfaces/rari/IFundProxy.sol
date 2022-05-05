// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface IFundProxy {

    function getRawFundBalancesAndPrices()
        external
        returns (
            string[] memory,
            uint256[] memory,
            uint8[][] memory,
            uint256[][] memory,
            uint256[] memory
        );
}
