// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAaveV4Oracle } from "../interfaces/protocols/aaveV4/IAaveV4Oracle.sol";

contract MockAaveV4Oracle is IAaveV4Oracle {
    IAaveV4Oracle public existingCoreSpokeOracle =
        IAaveV4Oracle(0x1da2C38dF15077Fde873EaFFA29e88D50836814a);

    function SPOKE() external view returns (address) {
        return existingCoreSpokeOracle.SPOKE();
    }

    function DECIMALS() external view returns (uint8) {
        return existingCoreSpokeOracle.DECIMALS();
    }

    function getReservePrice(uint256 reserveId) public view returns (uint256) {
        if (reserveId == 0) {
            uint256 harcodedEthPrice = 3360 * 1e8;
            return harcodedEthPrice;
        }
        return existingCoreSpokeOracle.getReservePrice(reserveId);
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
        return existingCoreSpokeOracle.getReserveSource(reserveId);
    }

    function DESCRIPTION() external view returns (string memory) {
        return existingCoreSpokeOracle.DESCRIPTION();
    }
}
