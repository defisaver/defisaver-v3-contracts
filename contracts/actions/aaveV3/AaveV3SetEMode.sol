// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveV3Helper.sol";

/// @title Supply a token to an Aave market
contract AaveV3SetEMode is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    struct Params {
        address market;
        uint8 categoryId;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);

        (uint256 categoryId, bytes memory logData) = _setEmode(params.market, params.categoryId);
        emit ActionEvent("AaveV3SetEMode", logData);
        return bytes32(categoryId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes calldata _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _setEmode(params.market, params.categoryId);
        //logger.logActionDirectEvent("AaveV3SetEMode", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _setEmode(params.market, params.categoryId);
        //logger.logActionDirectEvent("AaveV3SetEMode", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User deposits tokens to the Aave protocol
    /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @param _market Address provider for specific market
    /// @param _categoryId eMode category id (0 - 255) 
    function _setEmode(
        address _market,
        uint8 _categoryId
    ) internal returns (uint256, bytes memory) {
        IPoolV3 lendingPool = getLendingPool(_market);
        lendingPool.setUserEMode(_categoryId);
        bytes memory logData = abi.encode(
            _market,
            _categoryId
        );
        return (_categoryId, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
    
    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes20(params.market));
        encodedInput = bytes.concat(encodedInput, bytes1(params.categoryId));
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.market = address(bytes20(encodedInput[0:20]));
        params.categoryId = uint8(bytes1(encodedInput[20:21]));
    }
}
