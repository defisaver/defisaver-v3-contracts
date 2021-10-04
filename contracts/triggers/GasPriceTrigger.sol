// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IERC20.sol";

contract GasPriceTrigger is ITrigger, AdminAuth {
    struct Params {
        uint256 maxGasPrice;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        Params memory inputData = parseInputs(_subData);

        if (inputData.maxGasPrice >= tx.gasprice) return true;

        return false;
    }
    
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseInputs(bytes memory _subData) public pure returns (Params memory params) {
        params = abi.decode(_subData, (Params));
    }
}
