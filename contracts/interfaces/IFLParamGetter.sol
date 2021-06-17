// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract IFLParamGetter {
    function getFlashLoanParams(bytes memory _data)
        public
        view
        virtual
        returns (
            address[] memory tokens,
            uint256[] memory amount,
            uint256[] memory modes
        );
}
