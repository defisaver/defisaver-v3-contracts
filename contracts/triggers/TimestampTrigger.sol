// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/strategy/ISubStorage.sol";

contract TimestampTrigger is ITrigger, AdminAuth {
    struct SubParams {
        uint256 timestamp;
        uint256 interval;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseInputs(_subData);
        if (triggerSubData.timestamp < block.timestamp) return true;

        return false;
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
        SubParams memory triggerSubData = parseInputs(_subData);
        triggerSubData.timestamp += triggerSubData.interval;
        return abi.encode(triggerSubData);
    }
    
    function isChangeable() public pure override returns (bool){
        return true;
    }

    function parseInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
