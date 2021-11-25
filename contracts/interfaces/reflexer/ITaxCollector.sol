// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract ITaxCollector {
    struct CollateralType {
        uint256 stabilityFee;
        uint256 updateTime;
    }

    mapping (bytes32 => CollateralType) public collateralTypes;

    function taxSingle(bytes32) public virtual returns (uint);
}
