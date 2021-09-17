// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/mcd/IManager.sol";

// @title Action for withdrawing tokens from DSA
contract InstPullTokens is ActionBase, DSMath {
    using TokenUtils for address;
    
    struct Params {
        address dsaAddress;
        address[] tokens;
        uint256[] amounts;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        _pullTokens(inputData);

        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _pullTokens(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _pullTokens(Params memory _inputData) internal {
        require (_inputData.to != address(0), "Receiver address can't be burn address");
        bytes memory spellData = _createSpell(_inputData);
        (bool success, ) = _inputData.dsaAddress.call(spellData);

        require(success, "Withdrawing tokens from DSA failed");
    
        logger.Log(
            address(this),
            msg.sender,
            "InstPullTokens",
            abi.encode(_inputData)
        );
    }

    function _createSpell(Params memory _inputData) internal view returns (bytes memory) {
        require(_inputData.amounts.length == _inputData.tokens.length, "Arrays must be of the same size");

        uint256 numOfTokens = _inputData.tokens.length;

        string[] memory _targetNames = new string[](numOfTokens);
        bytes[] memory _datas = new bytes[](numOfTokens);
        address _origin = address(this);

        // connects dsaAccount with BASIC connector and transfers all tokens
        for (uint256 i = 0; i < numOfTokens; i++){
            _targetNames[i] = "BASIC-A";
            _datas[i] = abi.encodeWithSignature(
                "withdraw(address,uint256,address,uint256,uint256)",
                _inputData.tokens[i],
                _inputData.amounts[i],
                _inputData.to,
                0,
                0
            );
        }

        return abi.encodeWithSignature("cast(string[],bytes[],address)", _targetNames, _datas, _origin);
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
