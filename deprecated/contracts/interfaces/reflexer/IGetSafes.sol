// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IGetSafes {
    function getSafesAsc(address manager, address guy)
        external
        view
        virtual
        returns (uint256[] memory ids, address[] memory safes, bytes32[] memory collateralTypes);
    function getSafesDesc(address manager, address guy)
        external
        view
        virtual
        returns (uint256[] memory ids, address[] memory safes, bytes32[] memory collateralTypes);
}
