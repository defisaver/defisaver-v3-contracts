// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

contract MainnetLlamaLendAddresses {
    address internal constant BYTES_TRANSIENT_STORAGE = 0x424e4819A1C33F2D8FDe70CD3c4801c03dB62C72;
    address internal constant LLAMALEND_FACTORY = 0xeA6876DDE9e3467564acBeE1Ed5bac88783205E0;
    /// @dev this is the only WETH controller which has use_eth param default to True in Controller.remove_collateral
    address internal constant OLD_WETH_CONTROLLER = 0xaade9230AA9161880E13a38C83400d3D1995267b;
}
