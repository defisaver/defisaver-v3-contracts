// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAaveV4Oracle } from "../interfaces/protocols/aaveV4/IAaveV4Oracle.sol";

contract MockAaveV4Oracle is IAaveV4Oracle {
    function SPOKE() external view returns (address) {
        return address(0xBa97c5E52cd5BC3D7950Ae70779F8FfE92d40CdC);
    }

    function DECIMALS() external view returns (uint8) {
        return uint8(8);
    }

    function getReservePrice(uint256 reserveId) public view returns (uint256) {
        if (reserveId == 0) return 3360 * 1e8; // ETH
        if (reserveId == 1) return 4115 * 1e8; // wstETH
        if (reserveId == 2) return 92_000 * 1e8; // WBTC
        if (reserveId == 3) return 92_089 * 1e8; // cbBTC
        if (reserveId == 4) return 150 * 1e8; // aave
        if (reserveId == 5) return 1 * 1e8; // USDC
        if (reserveId == 6) return 1 * 1e8; // USDT
        if (reserveId == 7) return 1 * 1e8; // GHO
    }

    function getReservesPrices(uint256[] calldata reserveIds)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory prices = new uint256[](reserveIds.length);
        for (uint256 i = 0; i < reserveIds.length; i++) {
            prices[i] = getReservePrice(reserveIds[i]);
        }
        return prices;
    }

    function getReserveSource(uint256 reserveId) external view returns (address) {
        return address(0);
    }

    function DESCRIPTION() external view returns (string memory) {
        string memory description = "MockAaveV4Oracle";
        return description;
    }
}
