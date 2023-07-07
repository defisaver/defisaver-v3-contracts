// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../../actions/ActionBase.sol";
import "../../../LSV/LSVProxyRegistry.sol";

/// @title Changes the owner of the DSProxy and updated the DFSRegistry
contract ChangeLSVProxyOwner is ActionBase {

    /// @param newOwner address of the new owner
    /// @param noInProxiesArr Numeral Order of this proxy in LSVProxyRegistry.proxies(currOwner);
    struct Params {
        address newOwner;
        uint256 noInProxiesArr;
    }
    
    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.newOwner = _parseParamAddr(inputData.newOwner, _paramMapping[0], _subData, _returnValues);

        _changeOwner(inputData.newOwner, inputData.noInProxiesArr);

        return bytes32(bytes20(inputData.newOwner));
    }

    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _changeOwner(inputData.newOwner, inputData.noInProxiesArr);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _changeOwner(address _newOwner, uint256 _noInProxiesArr) internal {
        address currOwner = DSAuth(address(this)).owner();
        require(_newOwner != address(0), "Owner is empty address");
        LSVProxyRegistry(LSV_PROXY_REGISTRY_ADDRESS).changeProxyOwner(currOwner, _newOwner, _noInProxiesArr);
        DSAuth(address(this)).setOwner(_newOwner);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}