// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";
import "../helpers/LlamaLendHelper.sol";
import "./LlamaLendSwapper.sol";

contract LlamaLendSelfLiquidateWithColl is ActionBase, LlamaLendHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param percentage Fraction to liquidate; 100% = 10**18
    /// @param minCrvUsdExpected Users crvUsd collateral balance must be bigger than this
    /// @param swapAmount Amount of collateral to swap for crvUsd
    /// @param minAmount Minimum amount of crvUSD to receive after sell
    /// @param to Where to send the leftover funds if full close
    /// @param additionalData Additional data where curve swap path is encoded
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    /// @param dfsFeeDivider Fee divider, if a non standard fee is set it will check for custom fee
    struct Params {
        address controllerAddress;
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
        address llamalendSwapper = registry.getAddr(LLAMALEND_SWAPPER_ID);
        uint256[] memory info = new uint256[](5);
        info[0] = _params.gasUsed;
        if (_params.sellAllCollateral) info[1] = 1;
        
        transientStorage.setBytesTransiently(abi.encode(_params.exData));

        address collToken = ILlamaLendController(_params.controllerAddress).collateral_token();
        address debtToken = ILlamaLendController(_params.controllerAddress).borrowed_token();
        uint256 collStartingBalance = collToken.getBalance(address(this));
        uint256 debtStartingBalance = debtToken.getBalance(address(this));
        ILlamaLendController(_params.controllerAddress)
            .liquidate_extended(address(this), _params.minCrvUsdExpected, _params.percentage, false, llamalendSwapper, info);


        // cleanup after the callback if any funds are left over
        LlamaLendSwapper(llamalendSwapper).withdrawAll(_params.controllerAddress);

        // send funds to user
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