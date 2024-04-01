// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/LlamaLendHelper.sol";


/// @title Action that creates a llamalend position on behalf of user's wallet
/// @dev both collateralAmount and debtAmount must be non-zero
contract LlamaLendCreate is ActionBase, LlamaLendHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the llamalend market controller
    /// @param from Address from which to pull collateral asset, will default to user's wallet
    /// @param to Address that will receive the borrowed asset
    /// @param collateralAmount Amount of collateral asset to supply
    /// @param debtAmount Amount of debt asset to borrow (does not support uint.max)
    /// @param nBands Number of bands in which the collateral will be supplied
    struct Params {
        address controllerAddress;
        address from;
        address to;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 nBands;
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
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.collateralAmount = _parseParamUint(params.collateralAmount, _paramMapping[3], _subData, _returnValues);
        params.debtAmount = _parseParamUint(params.debtAmount, _paramMapping[4], _subData, _returnValues);
        params.nBands = _parseParamUint(params.nBands, _paramMapping[5], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _llamaLendCreate(params);
        emit ActionEvent("LlamaLendCreate", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _llamaLendCreate(params);
        logger.logActionDirectEvent("LlamaLendCreate", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _llamaLendCreate(Params memory _params) internal returns (uint256, bytes memory) {
        address collateralAsset = ILlamaLendController(_params.controllerAddress).collateral_token();
        address debtAsset = ILlamaLendController(_params.controllerAddress).borrowed_token();
        _params.collateralAmount = collateralAsset.pullTokensIfNeeded(_params.from, _params.collateralAmount);
        collateralAsset.approveToken(_params.controllerAddress, _params.collateralAmount);

        ILlamaLendController(_params.controllerAddress).create_loan(_params.collateralAmount, _params.debtAmount, _params.nBands);

        debtAsset.withdrawTokens(_params.to, _params.debtAmount);

        return (
            _params.debtAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}