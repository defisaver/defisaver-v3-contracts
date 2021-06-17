// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract IGetSafes {
    function getSafesAsc(address manager, address guy) external virtual view returns (uint[] memory ids, address[] memory safes, bytes32[] memory collateralTypes);
    function getSafesDesc(address manager, address guy) external virtual view returns (uint[] memory ids, address[] memory safes, bytes32[] memory collateralTypes);

}
