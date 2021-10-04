// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/strategy/ISubStorage.sol";

contract TimestampTrigger is ITrigger, AdminAuth {
    struct Params {
        uint256 timestamp;
        uint256 interval;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        Params memory inputData = parseInputs(_subData);
        if (inputData.timestamp < block.timestamp) return true;

        return false;
    }

    function changedSubData(bytes memory _subData) public view override returns (bytes memory) {
        Params memory subData = parseInputs(_subData);
        subData.timestamp += subData.interval;
        return abi.encode(subData);
    }
    
    function isChangeable() public pure override returns (bool){
        return true;
    }

    function parseInputs(bytes memory _subData) public pure returns (Params memory params) {
        params = abi.decode(_subData, (Params));
    }
}
