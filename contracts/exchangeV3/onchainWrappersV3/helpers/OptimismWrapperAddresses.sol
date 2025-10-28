// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract OptimismWrapperAddresses {
    address payable internal constant WALLET_ID =
        payable(0x322d58b9E75a6918f7e7849AEe0fF09369977e08);
    address internal constant UNI_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address internal constant UNI_V3_QUOTER = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;

    address internal constant CURVE_ADDRESS_PROVIDER = 0x0000000022D53366457F9d5E68Ec105046FC4383;
    address internal constant CURVE_ROUTER_NG = 0xF0d4c12A5768D806021F80a262B4d39d26C58b8D;

    // not used on L2
    address internal constant KYBER_INTERFACE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant UNI_V2_ROUTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}
