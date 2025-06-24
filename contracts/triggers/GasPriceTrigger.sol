// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";

/// @title Trigger contract that verifies if the current gas price of tx is lower than the max allowed gas price
contract GasPriceTrigger is ITrigger, AdminAuth {

    /// @param maxGasPrice max gas price that represents the triggerable point
    struct SubParams {
        uint256 maxGasPrice;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        if (triggerSubData.maxGasPrice >= tx.gasprice) return true;

        return false;
    }
    
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
