// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/LlamaLendHelper.sol";


/// @title Action that supplies collateral to a llamalend position
/// @dev collateralAmount must be non-zero, can be maxUint
contract LlamaLendSupply is ActionBase, LlamaLendHelper {
    using TokenUtils for address;

    error ZeroAmountSupplied();

    /// @param controllerAddress Address of the llamalend market controller
    /// @param from Address from which to pull collateral asset
    /// @param onBehalfOf Address for which we are supplying, will default to user's wallet
    /// @param collateralAmount Amount of collateral asset to supply
    struct Params {
        address controllerAddress;
        address from;
        address onBehalfOf;
        uint256 collateralAmount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.controllerAddress = _parseParamAddr(params.controllerAddress, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.onBehalfOf = _parseParamAddr(params.onBehalfOf, _paramMapping[2], _subData, _returnValues);
        params.collateralAmount = _parseParamUint(params.collateralAmount, _paramMapping[3], _subData, _returnValues);

        (uint256 suppliedAmount, bytes memory logData) = _llamaLendSupply(params);
        emit ActionEvent("LlamaLendSupply", logData);
        return bytes32(suppliedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _llamaLendSupply(params);
        logger.logActionDirectEvent("LlamaLendSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _llamaLendSupply(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.collateralAmount == 0) revert ZeroAmountSupplied();

        address collateralAsset = ILlamaLendController(_params.controllerAddress).collateral_token();
        _params.collateralAmount = collateralAsset.pullTokensIfNeeded(_params.from, _params.collateralAmount);
        collateralAsset.approveToken(_params.controllerAddress, _params.collateralAmount);

        if (_params.onBehalfOf == address(0)) {
            ILlamaLendController(_params.controllerAddress).add_collateral(_params.collateralAmount);
        } else {
            ILlamaLendController(_params.controllerAddress).add_collateral(_params.collateralAmount, _params.onBehalfOf);
        }

        return (
            _params.collateralAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}