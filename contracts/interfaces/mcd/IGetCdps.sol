// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

abstract contract IGetCdps {
    function getCdpsAsc(address manager, address guy)
        external
        view
        virtual
        returns (uint256[] memory ids, address[] memory urns, bytes32[] memory ilks);

    function getCdpsDesc(address manager, address guy)
        external
        view
        virtual
        returns (uint256[] memory ids, address[] memory urns, bytes32[] memory ilks);
}
