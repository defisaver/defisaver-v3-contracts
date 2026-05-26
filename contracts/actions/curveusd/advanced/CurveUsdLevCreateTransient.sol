// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ICrvUsdController } from "../../../interfaces/protocols/curveusd/ICurveUsd.sol";
import {
    ICurveUsdSwapperTransient
} from "../../../interfaces/protocols/curveusd/ICurveUsdSwapperTransient.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";
import { DFSExchangeData } from "../../../exchangeV3/DFSExchangeData.sol";
import { CurveUsdHelper } from "../helpers/CurveUsdHelper.sol";
import { DFSIds } from "../../../utils/DFSIds.sol";

/// @title Creates a new curveusd leveraged position with a given amount of collateral and debt
/// @notice This action uses internal swapper with transient storage to create a loan
contract CurveUsdLevCreateTransient is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which collAmount of collToken will be pulled
    /// @param collAmount Amount of collateral that the user is providing at first
    /// @param nBands Number of bands in which the collateral will be supplied for soft liquidation
    /// @param exData Exchange data for swapping (srcAmount will be amount of crvUSD to borrow and sell for collateral)
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    struct Params {
        address controllerAddress;
        address from;
        uint256 collAmount;
        uint256 nBands;
        DFSExchangeData.ExchangeData exData;
        uint32 gasUsed;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.controllerAddress =
            _parseParamAddr(params.controllerAddress, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.collAmount =
            _parseParamUint(params.collAmount, _paramMapping[2], _subData, _returnValues);
        params.nBands = _parseParamUint(params.nBands, _paramMapping[3], _subData, _returnValues);

        (uint256 debtGeneratedAndSold, bytes memory logData) = _create(params);
        emit ActionEvent("CurveUsdLevCreateTransient", logData);
        return bytes32(debtGeneratedAndSold);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _create(params);
        logger.logActionDirectEvent("CurveUsdLevCreateTransient", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _create(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev Zero input will just return so we explicitly revert here (see ICrvUsdController natspec)
        if (_params.collAmount == 0 || _params.exData.srcAmount == 0) revert ZeroAmountError();

        // Validate controller address
        if (!isControllerValid(_params.controllerAddress)) revert CurveUsdInvalidController();

        address collAddr = ICrvUsdController(_params.controllerAddress).collateral_token();
        address debtAddr = CRVUSD_TOKEN_ADDR;

        // Validate exchange data (we are selling debt to buy more collateral)
        if (_params.exData.srcAddr != debtAddr) revert CurveUsdInvalidExchangeSrcToken();
        if (_params.exData.destAddr != collAddr) revert CurveUsdInvalidExchangeDestToken();

        // Setup callback args
        address curveUsdTransientSwapper = registry.getAddr(DFSIds.CURVE_TRANSIENT_SWAPPER);
        uint256[] memory callbackArgs = new uint256[](5);
        callbackArgs[0] = _params.gasUsed;

        // Store exchange data for swapper contract to use
        transientStorage.setBytesTransiently(abi.encode(_params.exData));

        // Pull collateral from user and approve controller to spend it
        _params.collAmount = collAddr.pullTokensIfNeeded(_params.from, _params.collAmount);
        collAddr.approveToken(_params.controllerAddress, _params.collAmount);

        // This will call CurveUsdSwapperTransient.callback_deposit to sell crvUSD for more collateral.
        ICrvUsdController(_params.controllerAddress)
            .create_loan_extended(
                _params.collAmount,
                _params.exData.srcAmount,
                _params.nBands,
                curveUsdTransientSwapper,
                callbackArgs
            );

        // Sanity check:
        // This should never happen and there shouldn't be any funds left on swapper contract after sell,
        // but withdrawing it just in case and forwarding funds back to the user.
        (uint256 collBalance, uint256 debtBalance) = ICurveUsdSwapperTransient(
                curveUsdTransientSwapper
            ).withdrawAll(_params.controllerAddress);
        collAddr.withdrawTokens(_params.from, collBalance);
        debtAddr.withdrawTokens(_params.from, debtBalance);

        return (_params.exData.srcAmount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
