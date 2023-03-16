// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";

contract MorphoMarketStorage is AdminAuth {

    mapping (uint256 => address) public morphoAddresses;

    constructor(address _morphoGeneralAddress, address _morphoEthAddress) {
        morphoAddresses[0] = _morphoGeneralAddress;
        morphoAddresses[1] = _morphoEthAddress;
    }

    function getMorphoAddress(uint256 _emodeId) public view returns (address) {
        return morphoAddresses[_emodeId];
    }

    function addNewMorphoAddress(uint256 _emodeId, address _morphoAddress) public onlyOwner {
        morphoAddresses[_emodeId] = _morphoAddress;
    }
}