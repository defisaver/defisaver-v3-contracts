// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

contract MainnetCurveUsdAddresses {
    address internal constant CRVUSD_CONTROLLER_FACTORY_ADDR =
        0xC9332fdCB1C491Dcc683bAe86Fe3cb70360738BC;
    address internal constant CRVUSD_TOKEN_ADDR = 0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E;
    /// @dev Intentionally the old BytesTransientStorage, not the latest deployment.
    ///      Deployed advanced actions and the swapper must share the same one,
    ///      so moving to the new one needs all of them redeployed together.
    address internal constant BYTES_TRANSIENT_STORAGE = 0xB3FE6f712c8B8c64CD2780ce714A36e7640DDf0f;
}
