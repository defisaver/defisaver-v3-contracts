// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "./../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/mcd/IManager.sol";

// @title Action for withdrawing tokens from DSA
contract InstPullTokens is ActionBase {
    using TokenUtils for address;
    
    struct Params {
        address dsaAddress;
        address[] tokens;
        uint256[] amounts;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        bytes memory logData = _pullTokens(inputData);
        emit ActionEvent("InstPullTokens", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        bytes memory logData = _pullTokens(inputData);
        logger.logActionDirectEvent("InstPullTokens", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _pullTokens(Params memory _inputData) internal returns (bytes memory logData) {
        require (_inputData.to != address(0), "Receiver address can't be burn address");
        bytes memory spellData = _createSpell(_inputData);
        (bool success, ) = _inputData.dsaAddress.call(spellData);

        require(success, "Withdrawing tokens from DSA failed");
    
        logData = abi.encode(_inputData);
    }

    function _createSpell(Params memory _inputData) internal view returns (bytes memory) {
        require(_inputData.amounts.length == _inputData.tokens.length, "Arrays must be of the same size");

        uint256 numOfTokens = _inputData.tokens.length;

        string[] memory _targetNames = new string[](numOfTokens);
        bytes[] memory _data = new bytes[](numOfTokens);
        address _origin = address(this);

        // connects dsaAccount with BASIC connector and transfers all tokens
        for (uint256 i = 0; i < numOfTokens; i++){
            _targetNames[i] = "BASIC-A";
            _data[i] = abi.encodeWithSignature(
                "withdraw(address,uint256,address,uint256,uint256)",
                _inputData.tokens[i],
                _inputData.amounts[i],
                _inputData.to,
                0,
                0
            );
        }

        return abi.encodeWithSignature("cast(string[],bytes[],address)", _targetNames, _data, _origin);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
