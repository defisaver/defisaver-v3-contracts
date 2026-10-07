// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20 } from "../../../interfaces/token/IERC20.sol";
import { IDFSRegistry } from "../../../interfaces/core/IDFSRegistry.sol";
import {
    ILlamaLendController
} from "../../../interfaces/protocols/llamalend/ILlamaLendController.sol";
import { ILlamaLendSwapper } from "../../../interfaces/protocols/llamalend/ILlamaLendSwapper.sol";

import { AdminAuth } from "../../../auth/AdminAuth.sol";
import { LlamaLendHelper } from "../helpers/LlamaLendHelper.sol";
import { DFSExchangeWithTxSaver } from "../../../exchangeV3/DFSExchangeWithTxSaver.sol";
import { DFSExchangeData } from "../../../exchangeV3/DFSExchangeData.sol";
import { SafeERC20 } from "../../../_vendor/openzeppelin/SafeERC20.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { ActionsUtilHelper } from "../../utils/helpers/ActionsUtilHelper.sol";
import { GasFeeHelper } from "../../../utils/fee/GasFeeHelper.sol";
import {
    ReentrancyGuardTransient
} from "../../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";
import { DFSFeeLib } from "../../../utils/fee/DFSFeeLib.sol";

/// @title LlamaLendSwapper Callback contract for Llamalend extended actions
contract LlamaLendSwapper is
    LlamaLendHelper,
    DFSExchangeWithTxSaver,
    AdminAuth,
    ActionsUtilHelper,
    GasFeeHelper,
    ReentrancyGuardTransient,
    ILlamaLendSwapper
{
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    modifier onlyValidLlamaLendController(address _sender, uint256 _controllerId) {
        if (!isControllerValid(_sender, _controllerId)) {
            revert InvalidLlamaLendController();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CALLBACKS
    //////////////////////////////////////////////////////////////*/
    ///@dev called by llamalend controller after repay_extended
    ///@dev sends all collateral the user has to this contract, we swap a part or all of it
    ///@dev after swapping, llamalend will either recreate the position or close it fully
    function callback_repay(
        address _user,
        uint256,
        uint256,
        uint256,
        uint256[] memory _callbackArgs
    )
        external
        nonReentrant
        onlyValidLlamaLendController(msg.sender, _callbackArgs[1])
        returns (CallbackData memory cb)
    {
        uint256 gasUsed = _callbackArgs[0];
        ExchangeData memory exData =
            abi.decode(transientStorage.getBytesTransiently(), (DFSExchangeData.ExchangeData));
        address collToken = exData.srcAddr;
        address debtToken = exData.destAddr;

        uint256 receivedAmount = _performSell(exData, _user, debtToken, gasUsed);

        // if receivedAmount > current debt, leftover coll will be returned and receivedAmount-currentDebt will be returned
        // if receivedAmount < current debt, new position will be created with leftover coll and currentDebt-receivedAmount
        cb.stablecoins = receivedAmount;
        cb.collateral = collToken.getBalance(address(this));

        // approve the controller to create new position
        IERC20(collToken).safeApprove(msg.sender, cb.collateral);
        IERC20(debtToken).safeApprove(msg.sender, cb.stablecoins);
    }

    ///@dev called by llamalend controller after create_loan_extended and borrow_more_extended
    ///@dev sends exData.srcAmount of debt token to this contract for us to sell then pulls received coll token
    function callback_deposit(
        address _user,
        uint256,
        uint256,
        uint256,
        uint256[] memory _callbackArgs
    )
        external
        nonReentrant
        onlyValidLlamaLendController(msg.sender, _callbackArgs[1])
        returns (CallbackData memory cb)
    {
        uint256 gasUsed = _callbackArgs[0];
        ExchangeData memory exData =
            abi.decode(transientStorage.getBytesTransiently(), (DFSExchangeData.ExchangeData));

        address collToken = exData.destAddr;

        uint256 receivedAmount = _performSell(exData, _user, collToken, gasUsed);

        cb.collateral = receivedAmount;

        // approve the controller to create new position
        IERC20(collToken).safeApprove(msg.sender, cb.collateral);
    }

    ///@dev called by llamalend controller after liquidate_extended
    ///@dev if users debtTokenCollateralAmount is higher than debt, this won'te be called at all
    ///@dev this will send all marketCollateralAmount from users position to this contract, which we can sell all or a part of it
    function callback_liquidate(
        address _user,
        uint256,
        uint256,
        uint256,
        uint256[] memory _callbackArgs
    )
        external
        nonReentrant
        onlyValidLlamaLendController(msg.sender, _callbackArgs[1])
        returns (CallbackData memory cb)
    {
        uint256 gasUsed = _callbackArgs[0];
        bool sellAllCollateral = _callbackArgs[2] > 0;
        ExchangeData memory exData =
            abi.decode(transientStorage.getBytesTransiently(), (DFSExchangeData.ExchangeData));

        address collToken = exData.srcAddr;
        address debtToken = exData.destAddr;

        if (sellAllCollateral) {
            exData.srcAmount = collToken.getBalance(address(this));
        }

        uint256 receivedAmount = _performSell(exData, _user, debtToken, gasUsed);

        cb.stablecoins = receivedAmount;

        // how much collateral we have left after sell
        cb.collateral = collToken.getBalance(address(this));

        IERC20(collToken).safeApprove(msg.sender, cb.collateral);
        IERC20(debtToken).safeApprove(msg.sender, cb.stablecoins);
    }

    /*//////////////////////////////////////////////////////////////
                            HELPERS
    //////////////////////////////////////////////////////////////*/
    /// @dev No funds should be stored on this contract, but if anything is left send back to the user
    function withdrawAll(address _controllerAddress)
        external
        nonReentrant
        returns (uint256 collBalance, uint256 debtBalance)
    {
        address collToken = ILlamaLendController(_controllerAddress).collateral_token();
        address debtToken = ILlamaLendController(_controllerAddress).borrowed_token();

        collBalance = collToken.withdrawTokens(msg.sender, type(uint256).max);
        debtBalance = debtToken.withdrawTokens(msg.sender, type(uint256).max);
    }

    function _performSell(
        DFSExchangeData.ExchangeData memory _exData,
        address _user,
        address _feeToken,
        uint256 _gasUsedForAutomation
    ) internal returns (uint256) {
        (, uint256 receivedAmount, bool hasFee, bool txSaverFeeTaken) = _sellWithTxSaverChoice(
            _exData, _user, IDFSRegistry(REGISTRY_ADDR)
        );

        // can't take both automation fee and TxSaver fee
        if (_gasUsedForAutomation > 0 && !txSaverFeeTaken) {
            receivedAmount -= takeGasAndAutomationFee(
                _gasUsedForAutomation,
                _feeToken,
                receivedAmount,
                hasFee ? DFSFeeLib.MAX_AUTOMATION_FEE_DIVIDER : 0
            );
        }

        return receivedAmount;
    }
}
