// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/ReflexerHelper.sol";

/// @title Supply collateral to a Reflexer safe
contract ReflexerSupply is ActionBase, ReflexerHelper {
    using TokenUtils for address;
    struct Params {
        uint256 safeId;
        uint256 amount;
        address adapterAddr;
        address from;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.safeId = _parseParamUint(inputData.safeId, _paramMapping[0], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[1], _subData, _returnValues);
        inputData.adapterAddr = _parseParamAddr(inputData.adapterAddr, _paramMapping[2], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[3], _subData, _returnValues);

        uint256 returnAmount = _reflexerSupply(inputData.safeId, inputData.amount, inputData.adapterAddr, inputData.from);

        return bytes32(returnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _reflexerSupply(inputData.safeId, inputData.amount, inputData.adapterAddr, inputData.from);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Supplies collateral to the safe
    /// @param _safeId Id of the safe
    /// @param _amount Amount of tokens to supply
    /// @param _adapterAddr Adapter address of the reflexer collateral
    /// @param _from Address where to pull the collateral from
    function _reflexerSupply(
        uint256 _safeId,
        uint256 _amount,
        address _adapterAddr,
        address _from
    ) internal returns (uint256) {
        address tokenAddr = getTokenFromAdapter(_adapterAddr);

        // if amount type(uint).max, pull current _from  balance
        if (_amount == type(uint256).max) {
            _amount = tokenAddr.getBalance(_from);
        }

        // Pull the underlying token and adapter the reflexer adapter pool
        tokenAddr.pullTokensIfNeeded(_from, _amount);
        tokenAddr.approveToken(_adapterAddr, _amount);
        IBasicTokenAdapters(_adapterAddr).join(address(this), _amount);

        int256 convertAmount = toPositiveInt(_amount);

        // Supply to the safe balance
        safeEngine.modifySAFECollateralization(
            safeManager.collateralTypes(_safeId),
            safeManager.safes(_safeId),
            address(this),
            address(this),
            convertAmount,
            0
        );

        logger.Log(
            address(this),
            msg.sender,
            "ReflexerSupply",
            abi.encode(_safeId, _amount, _adapterAddr, _from)
        );

        return _amount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
