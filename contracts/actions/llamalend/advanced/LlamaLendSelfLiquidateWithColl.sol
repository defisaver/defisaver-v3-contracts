// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";
import { LlamaLendHelper } from "../helpers/LlamaLendHelper.sol";
import { LlamaLendSwapper } from "./LlamaLendSwapper.sol";
import { ILlamaLendController } from "../../../interfaces/llamalend/ILlamaLendController.sol";
import { DFSExchangeData } from "../../../exchangeV3/DFSExchangeData.sol";

/// @title LlamaLendSelfLiquidateWithColl
/// @dev if current debtToken coll > debt, callback address won't be called -> no swap will be done (any coll token and debt token will be send to params.to)
contract LlamaLendSelfLiquidateWithColl is ActionBase, LlamaLendHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param controllerId id that matches controller number in factory
    /// @param percentage Fraction to liquidate; 100% = 10**18
    /// @param minCrvUsdExpected Users crvUsd collateral balance must be bigger than this
    /// @param exData exchange data for swapping (srcAmount will be amount of coll token sold)
    /// @param to Where to send the leftover funds if full close
    /// @param sellAllCollateral Since coll token amount is changeable during soft liquidation, this will replace srcAmount in exData with coll amount
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    struct Params {
        address controllerAddress;
        uint256 controllerId;
        uint256 percentage; // Fraction to liquidate; 100% = 10**18
        uint256 minCrvUsdExpected;
        DFSExchangeData.ExchangeData exData;
        address to;
        bool sellAllCollateral;
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

        params.controllerAddress = _parseParamAddr(params.controllerAddress, _paramMapping[0], _subData, _returnValues);
        params.percentage = _parseParamUint(params.percentage, _paramMapping[1], _subData, _returnValues);
        params.minCrvUsdExpected = _parseParamUint(params.minCrvUsdExpected, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _liquidate(params);
        emit ActionEvent("LlamaLendSelfLiquidateWithColl", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _liquidate(params);
        logger.logActionDirectEvent("LlamaLendSelfLiquidateWithColl", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _liquidate(Params memory _params) internal returns (uint256, bytes memory) {
        if (!isControllerValid(_params.controllerAddress, _params.controllerId)) revert InvalidLlamaLendController();
        address llamalendSwapper = registry.getAddr(LLAMALEND_SWAPPER_ID);
        uint256[] memory info = new uint256[](5);
        info[0] = _params.gasUsed;
        info[1] = _params.controllerId;
        if (_params.sellAllCollateral) info[2] = 1;
        
        transientStorage.setBytesTransiently(abi.encode(_params.exData));

        address collToken = ILlamaLendController(_params.controllerAddress).collateral_token();
        address debtToken = ILlamaLendController(_params.controllerAddress).borrowed_token();
        uint256 collStartingBalance = collToken.getBalance(address(this));
        uint256 debtStartingBalance = debtToken.getBalance(address(this));
        if (_params.controllerAddress == OLD_WETH_CONTROLLER && block.chainid == 1) {
            ILlamaLendController(_params.controllerAddress)
            .liquidate_extended(address(this), _params.minCrvUsdExpected, _params.percentage, false, llamalendSwapper, info);
        } else {
            ILlamaLendController(_params.controllerAddress)
            .liquidate_extended(address(this), _params.minCrvUsdExpected, _params.percentage, llamalendSwapper, info);
        }
        
        // there shouldn't be any funds left on swapper contract but withdrawing it just in case
        LlamaLendSwapper(llamalendSwapper).withdrawAll(_params.controllerAddress);

        // there will usually be both coll token and debt token, unless we're selling all collateral
        (, uint256 debtTokenReceived) = _sendLeftoverFunds(collToken, debtToken, collStartingBalance, debtStartingBalance, _params.to);
    
        return (
            debtTokenReceived,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}