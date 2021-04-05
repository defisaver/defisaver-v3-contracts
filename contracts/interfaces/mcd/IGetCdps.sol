
// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

abstract contract IGetCdps {
    function getCdpsAsc(address manager, address guy) external virtual view returns (uint[] memory ids, address[] memory urns, bytes32[] memory ilks);

    function getCdpsDesc(address manager, address guy) external virtual view returns (uint[] memory ids, address[] memory urns, bytes32[] memory ilks);
}