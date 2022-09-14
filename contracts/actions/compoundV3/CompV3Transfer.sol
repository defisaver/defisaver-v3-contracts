// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";

/// @title Transfer amount of specified collateral to another wallet
contract CompV3Transfer is ActionBase, CompV3Helper {
    using TokenUtils for address;

    struct Params {
        address market;
        address from;
        address to;
        address tokenAddr;
        uint256 amount;
    }
    error CompV3TransferError();

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[3], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[4], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _transfer(params.market, params.from, params.to, params.tokenAddr, params.amount);
        emit ActionEvent("CompV3Transfer", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _transfer(params.market, params.from, params.to, params.tokenAddr, params.amount);
        logger.logActionDirectEvent("CompV3Transfer", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Transfer amount of supplied assets from one address to another
    /// @dev Amount type(uint).max will transfer the whole amount of supplied assets
    /// @param _market Main Comet proxy contract that is different for each compound market
    /// @param _from The address of an account that is the sender of the asset in the transaction
    /// @param _to The address of an account that is the receiver in the transaction
    /// @param _asset The ERC-20 address of the asset that is being sent in the transaction
    /// @param _amount Amount of the specified asset to be transferred
    function _transfer(
        address _market,
        address _from,
        address _to,
        address _asset,
        uint256 _amount
    ) internal returns (uint256, bytes memory) {
        if( _to == address(0)) { 
            revert CompV3TransferError();
        }

        address tokenAddr = _asset;

        if (_from == address(0)) {
            _from = address(this);
        }

        IComet(_market).transferAssetFrom(_from, _to, tokenAddr, _amount);

        bytes memory logData = abi.encode(_market, _from, _to, _asset, _amount);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
