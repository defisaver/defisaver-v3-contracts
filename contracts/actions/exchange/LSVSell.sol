// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IWStEth } from "../../interfaces/lido/IWStEth.sol";
import { IWeEth } from "../../interfaces/etherFi/IWeEth.sol";
import { ILiquidityPool } from "../../interfaces/etherFi/ILiquidityPool.sol";
import { DFSExchangeCore } from "../../exchangeV3/DFSExchangeCore.sol";
import { ActionBase } from "../ActionBase.sol";
import { UtilHelper } from "../../utils/helpers/UtilHelper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title A exchange sell action through the LSV exchange with no fee (used only for ETH Saver)
/// @dev weth and steth will be transformed into wsteth directly if the rate is better than minPrice
/// @dev The only action which has wrap/unwrap WETH builtin so we don't have to bundle into a recipe
contract LSVSell is ActionBase, UtilHelper, DFSExchangeCore {

    using TokenUtils for address;

    struct Params {
        ExchangeData exchangeData;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.exchangeData.srcAddr = _parseParamAddr(
            params.exchangeData.srcAddr,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.exchangeData.destAddr = _parseParamAddr(
            params.exchangeData.destAddr,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        params.exchangeData.srcAmount = _parseParamUint(
            params.exchangeData.srcAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);

        (uint256 exchangedAmount, bytes memory logData) = _lsvSell(params.exchangeData, params.from, params.to);
        emit ActionEvent("LSVSell", logData);
        return bytes32(exchangedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public virtual override payable   {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _lsvSell(params.exchangeData, params.from, params.to);
        logger.logActionDirectEvent("LSVSell", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Sells a specified srcAmount for the dest token
    /// @param _exchangeData DFS Exchange data struct
    /// @param _from Address from which we'll pull the srcTokens
    /// @param _to Address where we'll send the _to token
    function _lsvSell(
        ExchangeData memory _exchangeData,
        address _from,
        address _to
    ) internal returns (uint256, bytes memory) {
        // if we set srcAmount to max, take the whole user's wallet balance
        if (_exchangeData.srcAmount == type(uint256).max) {
            _exchangeData.srcAmount = _exchangeData.srcAddr.getBalance(address(this));
        }

        // if source and destination address are same we want to skip exchanging and take no fees
        if (_exchangeData.srcAddr == _exchangeData.destAddr){
            bytes memory sameAssetLogData = abi.encode(
                address(0),
                _exchangeData.srcAddr,
                _exchangeData.destAddr,
                _exchangeData.srcAmount,
                _exchangeData.srcAmount,
                0
        );
            return (_exchangeData.srcAmount, sameAssetLogData);
        }

        // Wrap eth if sent directly
        if (_exchangeData.srcAddr == TokenUtils.ETH_ADDR) {
            TokenUtils.depositWeth(_exchangeData.srcAmount);
            _exchangeData.srcAddr = TokenUtils.WETH_ADDR;
        } else {
            _exchangeData.srcAddr.pullTokensIfNeeded(_from, _exchangeData.srcAmount);
        }

        // We always swap with weth, convert token addr when eth sent for unwrapping later
        bool isEthDest;
        if (_exchangeData.destAddr == TokenUtils.ETH_ADDR) {
            _exchangeData.destAddr = TokenUtils.WETH_ADDR;
            isEthDest = true;
        } 

        _exchangeData.dfsFeeDivider = 0;
        bool shouldSell = true;

        address wrapper;
        uint256 exchangedAmount;

        if (_exchangeData.destAddr == WSTETH_ADDR) {
            (shouldSell, exchangedAmount) = _stakeWithLidoIfBetterRate(
                _exchangeData.srcAddr,
                _exchangeData.srcAmount,
                _exchangeData.minPrice
            );
        }

        if (_exchangeData.destAddr == WEETH_ADDR) {
            (shouldSell, exchangedAmount) = _stakeWithEtherFiIfBetterRate(
                _exchangeData.srcAddr,
                _exchangeData.srcAmount,
                _exchangeData.minPrice
            );
        }

        if (shouldSell){
            (wrapper, exchangedAmount) = _sell(_exchangeData);
        }

        if (isEthDest) {
            TokenUtils.withdrawWeth(exchangedAmount);

            (bool success, ) = _to.call{value: exchangedAmount}("");
            require(success, "Eth send failed");
        } else {
             _exchangeData.destAddr.withdrawTokens(_to, exchangedAmount);
        }

        bytes memory logData = abi.encode(
            wrapper,
            _exchangeData.srcAddr,
            _exchangeData.destAddr,
            _exchangeData.srcAmount,
            exchangedAmount,
            _exchangeData.dfsFeeDivider,
            shouldSell
        );
        return (exchangedAmount, logData);
    }

    /*//////////////////////////////////////////////////////////////
                                  LIDO
    //////////////////////////////////////////////////////////////*/
    function _stakeWithLidoIfBetterRate(address _srcAddr, uint256 _srcAmount, uint256 _minPrice) internal returns (bool shouldSell, uint256 exchangedAmount) {
        if (_srcAddr != TokenUtils.WETH_ADDR && _srcAddr != STETH_ADDR){
            return (true, 0);
        }

        if (_minPrice > IWStEth(WSTETH_ADDR).tokensPerStEth()) {
            return (true, 0);
        }

        if (_srcAddr == TokenUtils.WETH_ADDR){
            exchangedAmount = _lidoStakeAndWrapWETH(_srcAmount);
        } else if (_srcAddr == STETH_ADDR){
            exchangedAmount = _lidoWrapStEth(_srcAmount);
        }

        return (false, exchangedAmount);
    }

    function _lidoStakeAndWrapWETH(uint256 wethAmount) internal returns (uint256 wStEthReceivedAmount){
        TokenUtils.withdrawWeth(wethAmount);

        uint256 wStEthBalanceBefore = WSTETH_ADDR.getBalance(address(this));
        (bool sent, ) = payable(WSTETH_ADDR).call{value: wethAmount}("");
        require(sent, "Failed to send Ether");
        uint256 wStEthBalanceAfter = WSTETH_ADDR.getBalance(address(this));

        wStEthReceivedAmount = wStEthBalanceAfter - wStEthBalanceBefore;
    }

    function _lidoWrapStEth(uint256 _stethAmount) internal returns (uint256 wStEthReceivedAmount){
        STETH_ADDR.approveToken(WSTETH_ADDR, _stethAmount);

        wStEthReceivedAmount = IWStEth(WSTETH_ADDR).wrap(_stethAmount);
    }

    /*//////////////////////////////////////////////////////////////
                                ETHER.FI
    //////////////////////////////////////////////////////////////*/
    function _stakeWithEtherFiIfBetterRate(address _srcAddr, uint256 _srcAmount, uint256 _minPrice) internal returns (bool shouldSell, uint256 exchangedAmount) {
        if (_srcAddr != TokenUtils.WETH_ADDR && _srcAddr != EETH_ADDR){
            return (true, 0);
        }

        if (_minPrice > IWeEth(WEETH_ADDR).getWeETHByeETH(1 ether)) {
            return (true, 0);
        }

        if (_srcAddr == TokenUtils.WETH_ADDR){
            exchangedAmount = _etherFiStake(_srcAmount);
        } else if (_srcAddr == EETH_ADDR){
            exchangedAmount = _etherFiWrapEeth(_srcAmount);
        }

        return (false, exchangedAmount);
    }

    function _etherFiStake(uint256 wethAmount) internal returns (uint256 weEthReceivedAmount){
        TokenUtils.withdrawWeth(wethAmount);

        uint256 eEthBalanceBefore = EETH_ADDR.getBalance(address(this));
        ILiquidityPool(ETHER_FI_LIQUIDITY_POOL).deposit{value: wethAmount}();
        uint256 eEthBalanceAfter = EETH_ADDR.getBalance(address(this));

        uint256 eEthReceivedAmount = eEthBalanceAfter - eEthBalanceBefore;

        weEthReceivedAmount = _etherFiWrapEeth(eEthReceivedAmount);
    }

    function _etherFiWrapEeth(uint256 _eethAmount) internal returns (uint256 weEthReceivedAmount){
        EETH_ADDR.approveToken(WEETH_ADDR, _eethAmount);

        weEthReceivedAmount = IWeEth(WEETH_ADDR).wrap(_eethAmount);
    }


    /*//////////////////////////////////////////////////////////////
                                HELPERS
    //////////////////////////////////////////////////////////////*/
    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
