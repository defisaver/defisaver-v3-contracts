// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";

contract MorphoMarketStorage is AdminAuth {

    mapping (uint256 => address) public morphoAddresses;

    constructor() {
        address morpho_aaveV3_eth = 0x33333aea097c193e66081E930c33020272b33333;
        morphoAddresses[1] = morpho_aaveV3_eth;
    }

    function getMorphoAddress(uint256 _emodeId) public view returns (address) {
        return morphoAddresses[_emodeId];
    }

    function addNewMorphoAddress(uint256 _emodeId, address _morphoAddress) public onlyOwner {
        morphoAddresses[_emodeId] = _morphoAddress;
    }
}